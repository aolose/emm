import { type SQLQueryBindings, Database } from 'bun:sqlite';
import { Log, noNullKeyValues, printSql, setKey, sqlFields, sqlVal, val } from '../utils';
import * as models from '../model';
import { getConstraint, getPrimaryKey, pkMap, primaryKey } from '../model/decorations';
import type { Class, dbHooks, Model, Obj } from '$lib/types';
import { randNum } from '$lib/utils';

const tables = Object.values(models);
const INTEGER = 'INTEGER';
const TEXT = 'TEXT';

// model
type M = (typeof tables)[number];

export function getColumnType(v: SQLQueryBindings) {
	let type = 'BLOB';
  const name = v?.constructor?.name;
  switch (name) {
    case 'Number':
    case 'Boolean':
    case 'Date':
      type = INTEGER;
      break;
    case 'String':
      type = TEXT;
      break;
  }
  return type;
}

function createTable(Model: M) {
  const fields = [];
  const t = new Model();
  const e = Object.entries(t);
  const pk = [];
  for (const [k, v] of e) {
    if (typeof v === 'function' || k[0] === '_') continue;
    const type = getColumnType(v);
    const s = [...getConstraint(t, k)];
    const pi = s.indexOf(primaryKey);
    if (pi !== -1) {
      s.splice(pi, 1);
      pk.push(k);
    }
    const constraint = s.join(' ') || '';
    fields.push(`${k} ${type} ${constraint}`);
  }
  if (pk.length) {
    fields.push(`PRIMARY KEY (${pk.join()})`);
  }
  return `CREATE TABLE ${Model.name}
          (
              ${fields.join()}
          )`;
}

function select(obj: Obj<Model>) {
  const table = obj.constructor.name;
  const [k, v] = noNullKeyValues(obj);
  const where = k.length ? k.map((a) => `${a}=?`).join(' and ') : '';
  return [
    `SELECT *
     FROM ${table}`,
    where,
    v
  ];
}

function insert(obj: Obj<Model>): [string, SQLQueryBindings[]] {
	const table = obj.constructor.name;
  const [k, m] = noNullKeyValues(obj);
  const v = sqlVal(m);
  const q = sqlFields(k.length);
  if (!k.length) return ['', v];
  return [
    `insert into ${table} (${k.join()})
     values (${q})`,
    v
  ];
}

function update(obj: Obj<Model>): [string, SQLQueryBindings[]] {
	const table = obj.constructor.name;
  const pk = getPrimaryKey(table) as string;
  const [k, m] = noNullKeyValues(obj);
  const v = sqlVal(m);
  const w = [];
  if (pk) {
    const i = k.indexOf(pk);
    w.push(k.splice(i, 1)[0]);
    v.push(v.splice(i, 1)[0]);
  }
  if (!k.length) return ['', v];
  return [
    `update ${table}
     set ${k.map((a) => `${a} = ?`).join()}${w.length ? ` where ${pk}=?` : ''}`,
    v
  ];
}

export class DB {
  // expose for test
  db: Database;

  constructor(path = 'db') {
    this.db = new Database(path);
    process.on('exit', () => this.db.close());
  }

  private select(one: boolean, o: Obj<Model>, where = '', values: SQLQueryBindings[]) {
    const [sql, w, v] = select(o);
    const wh = [w, where].filter((a) => a).join(' and ');
    const s = sql + (wh ? ` WHERE ${wh}` : '').replace(/where order by/i, 'order by');
    const params = sqlVal([...v, ...values]);
    Log.debug('sql', printSql(s, params));
    const paper = this.db.prepare(s);
    if (one) return paper.get(...params);
    return paper.all(...params);
  }

  get<T extends Model>(o: Obj<T>, where?: string, ...values: SQLQueryBindings[]) {
    return this.select(true, o, where, values) as T | undefined;
  }

  all<T extends Model>(o: Obj<T>, where?: string, ...values: SQLQueryBindings[]) {
    return this.select(false, o, where, values) as T[];
  }

  count(o: Class<Model>, where?: SQLQueryBindings[]): number {
    let sql = `select count(*) as c
               from ${o.name}`;
    let params: SQLQueryBindings[] = [];
    if (where && where.length > 1) {
      sql = `${sql} where ${where[0]}`;
      params = where.slice(1);
    }
    return (this.db.prepare(sql).get(...params) as { c: number }).c;
  }

  page<T extends Model>(
    o: Class<T>,
    page: number,
    size: number,
    order = [] as string[],
    where?: SQLQueryBindings[],
    after?: (a: T[]) => T[]
  ) {
    const s = `select *
               from ${o.name}`;
    const d = order.length ? ` order by ${order.join()}` : '';
    const l = ` limit ${size * (page - 1)},${size}`;
    let w = '';
    let p = [] as SQLQueryBindings[];
    if (where && where.length) {
      w = ` where ${where[0]}`;
      p = where?.slice(1) || [];
    }
    const sql = s + w + d + l;
    Log.debug('sql', printSql(sql, p));
    const r = this.db.prepare(sql).all(...p) as T[];
    return after ? after(r) : r;
  }

  save(
    a: Obj<Model>,
    opt: {
      create?: boolean;
      skipSave?: boolean;
      search?: boolean;
      override_create?: boolean;
    } = {}
  ) {
    const { create, skipSave, search, override_create = false } = opt;
    const now = Date.now();
    const o = a as Obj<Model> & dbHooks;
    let changeSave = true;
    if (!skipSave && o.onSave) {
      changeSave = !o.onSave(this, now);
    }
    const table = o.constructor.name;
    if (changeSave && !skipSave) setKey(a, 'save', now);
    const pk = getPrimaryKey(table) as keyof Obj<Model> & string;
    const kv = val(o[pk]);
    let sql: string;
    let values: SQLQueryBindings[];
    if ((!kv || create) && !search) {
      if (!override_create) setKey(a, 'createAt', now);
      [sql, values] = insert(o);
    } else [sql, values] = update(o);
    Log.debug('save', printSql(sql, values));
    if (!sql) {
      Log.warn('save', table, 'empty sql');
      return { changes: 0, lastInsertRowid: 0 };
    }
    const r = this.db.prepare(sql).run(...values);
    if (pk && r.changes === 1 && !kv) {
      const t = typeof kv;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      o[pk] =
        t === 'number' || t === 'bigint'
          ? r.lastInsertRowid
          : (
              this.db
                .prepare(
                  `select ${pk}
                   from ${table}
                   where rowid = ?`
                )
                .get(r.lastInsertRowid) as { [key: string]: bigint }
            )[pk];
    }
    return r;
  }

  delByPk<T extends Model>(c: Class<T>, pks: SQLQueryBindings[]) {
    const pk = pkMap[c.name] as string;
    const sql = `delete
                 from ${c.name}
                 where ${pk} in (${sqlFields(pks.length)})`;
    Log.debug('delete', sql, pks);
    return this.db.prepare(sql).run(...pks);
  }

  del<T extends Model>(o: Obj<T>, where?: string, ...values: SQLQueryBindings[]) {
    const table = o.constructor.name;
    const pk = getPrimaryKey(table) as keyof typeof o & string;
    const wh = [];
    const va: SQLQueryBindings[] = [];
    if (pk && pk in o) {
      wh.push(`${pk}=?`);
      va.push(o[pk] as SQLQueryBindings);
    }
    if (where) {
      wh.push(where);
    }
    if (values && values.length) va.push(...values);
    const cd = wh.join(' and ');
    if (!cd) throw new Error(`empty condition when delete ${table}`);
    const sql = `delete
                 from ${o.constructor.name}
                 where ${cd}`;
    return this.db.prepare(sql).run(...va);
  }

  createTables() {
    type columnInfo = {
      name: string;
      type: string;
      unique: 0 | 1;
      notnull: 0 | 1;
      pk: 0 | 1;
    };
    const exist = new Set(this.tables());
    let migration = 0;
    for (const s of tables) {
      const name = s.name;
      if (exist.has(name)) {
        const info = {} as { [key: string]: columnInfo };
        this.db
          .query<columnInfo, string[]>(`PRAGMA table_info('${name}')`)
          .all()
          .forEach((a) => {
            info[a.name] = a;
          });
        const idxInf = this.db
          .query<{ name: string; unique: boolean }, string[]>(`PRAGMA index_list(${name})`)
          .all();
        if (idxInf.length) {
          idxInf.forEach((a: { name: string; unique: boolean }) => {
            if (a && a.unique) {
              const i = this.db.query<columnInfo, string[]>(`pragma index_info(${a.name})`).get();
              if (i) info[i.name].unique = 1;
            }
          });
        }
        const o = new s();
        const same: string[] = [];
        for (const [k, v] of Object.entries(o)) {
          if (typeof v === 'function' || k.startsWith('_')) continue;
          const cons = getConstraint(o, k);
          const type = getColumnType(v);
          const inf = info[k];
          if (inf) {
            const unique = +cons.has('UNIQUE');
            const notnull = +cons.has('NOT Null');
            const pk = +cons.has(primaryKey);
            if (
              inf.type === type &&
              (!notnull || inf.notnull === notnull) &&
              (!unique || inf.unique === unique) &&
              (!pk || inf.pk === pk)
            ) {
              same.push(k);
            } else {
              migration = 1;
            }
          } else migration = 1;
        }
        if (migration) {
          const nm = name + '_' + randNum();
          const column = same.join();
          const ru = [`ALTER TABLE ${name} RENAME TO ${nm}`, createTable(s)];
          if (column)
            ru.push(`INSERT INTO ${name} (${column})
                     SELECT ${column}
                     FROM ${nm}`);
          ru.push(`DROP TABLE ${nm}`);
          this.db.exec(ru.join(';'));
        }
      } else {
        this.db.exec(createTable(s));
      }
    }
  }

  tables() {
    return this.db
      .prepare(
        `SELECT name
         FROM sqlite_schema
         WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%';`
      )
      .all()
      .map((a) => (a as { name: string }).name);
  }
}

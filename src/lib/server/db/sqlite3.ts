import better from "better-sqlite3";
import { Log, noNullKeyValues, setKey, sqlFields, sqlVal, val } from "../utils";
import * as models from "../model";
import { getConstraint, getPrimaryKey, pkMap, primaryKey, unique } from "../model/decorations";
import type { Class, dbHooks, Model, Obj } from "$lib/types";
import { randNum } from "$lib/utils";

const tables = Object.values(models);
const INTEGER = "INTEGER";
const TEXT = "TEXT";

// model
type M = typeof tables[number];

export function getColumnType(v: unknown) {
  let type = "BLOB";
  const name = v?.constructor?.name;
  switch (name) {
    case "Number":
    case "Boolean":
    case "Date":
      type = INTEGER;
      break;
    case "String":
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
    if (typeof v === "function" || k[0] === "_") continue;
    const type = getColumnType(v);
    const s = [...getConstraint(t, k)];
    const pi = s.indexOf(primaryKey);
    if (pi !== -1) {
      s.splice(pi, 1);
      pk.push(k);
    }
    const constraint = s.join(" ") || "";
    fields.push(`${k} ${type} ${constraint}`);
  }
  if (pk.length) {
    fields.push(`PRIMARY KEY (${pk.join()})`);
  }
  return `CREATE TABLE ${Model.name} (${fields.join()})`;
}

function select(obj: Obj<Model>) {
  const table = obj.constructor.name;
  const [k, v] = noNullKeyValues(obj);
  const where = k.length ? k.map((a) => `${a}=?`).join(" and ") : "";
  return [`SELECT * FROM ${table}`, where, v];
}

function insert(obj: Obj<Model>): [string, unknown[]] {
  const table = obj.constructor.name;
  const [k, m] = noNullKeyValues(obj);
  const v = sqlVal(m);
  const q = sqlFields(k.length);
  return [`insert into ${table} (${k.join()}) values (${q})`, v];
}

function update(obj: Obj<Model>): [string, unknown[]] {
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
  return [`update ${table} set ${k.map(a => `${a} = ?`).join()}${w.length ? ` where ${pk}=?` : ""}`, v];
}


export class DB {
  // expose for test
  db: better.Database;

  constructor(path = "db") {
    this.db = new better(path);
    process.on("exit", () => this.db.close());
  }

  private select(one: boolean, o: Obj<Model>, where = "", values: unknown[]) {
    const [sql, w, v] = select(o);
    const wh = [w, where].filter((a) => a).join(" and ");
    const s = sql + (wh ? ` WHERE ${wh}` : "").replace(/where order by/i,'order by');
    const params = sqlVal([...v, ...values]);
    Log.debug('sql',s)
    const paper = this.db.prepare(s);
    if (one) return paper.get(...params);
    return paper.all(...params);
  }

  get<T extends Model>(o: Obj<T>, where?: string, ...values: unknown[]) {
    return this.select(true, o, where, values) as T | undefined;
  }

  all<T extends Model>(o: Obj<T>, where?: string, ...values: unknown[]) {
    return this.select(false, o, where, values) as T[];
  }

  count(o: Class<Model>, where?: [string, ...unknown[]]): number {
    let sql = `select count(*) as c from ${o.name}`;
    let params: unknown[] = [];
    if (where && where.length > 1) {
      sql = `${sql} where ${where[0]}`;
      params = where.slice(1);
    }
    return this.db.prepare(sql).get(...params).c as number;
  }

  page<T extends Model>(
    o: Class<T>,
    page: number,
    size: number,
    order = [] as string[],
    where?: [string, ...unknown[]],
    after?: (a: T[]) => T[]
  ) {
    const s = `select * from ${o.name}`;
    const d = order.length ? ` order by ${order.join()}` : "";
    const l = ` limit ${size * (page - 1)},${size}`;
    let w = "";
    let p = [] as unknown[];
    if (where && where.length > 1) {
      w = ` where ${where[0]}`;
      p = where?.slice(1);
    }
    const sql = s + w + d + l;
    Log.debug("sql", sql);
    const r = this.db.prepare(sql).all(...p) as T[];
    return after ? after(r) : r;
  }

  save(a: Obj<Model>, opt: {
    create?: boolean, skipSave?: boolean, search?: boolean
  } = {}) {
    const { create, skipSave, search } = opt;
    const now = Date.now();
    const o = a as Obj<Model> & dbHooks;
    let changeSave = true;
    if (!skipSave && o.onSave) {
      changeSave = !o.onSave(this, now);
    }
    const table = o.constructor.name;
    if (changeSave) setKey(a, "save", now);
    const pk = getPrimaryKey(table) as keyof typeof o & string;
    const kv = val(o[pk]);
    let sql: string;
    let values: unknown[];
    if ((!kv || create) && !search) {
      setKey(a, "createAt", now);
      [sql, values] = insert(o);
    } else [sql, values] = update(o);
    const r = this.db.prepare(sql).run(...values);
    if (r.changes === 1 && !kv) {
      const t = typeof kv;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      o[pk] = (t === "number" || t === "bigint") ? r.lastInsertRowid :
        this.db.prepare(`select ${pk} from ${table} where rowid=?`).get(r.lastInsertRowid)[pk];
    }
    return r;
  }

  delByPk<T extends Model>(c: Class<T>, pks: unknown[]) {
    const pk = pkMap[c.name] as string;
    const sql = `delete from ${c.name} where ${pk} in (${sqlFields(pks.length)})`;
    Log.debug('delete',sql,pks)
    return this.db.prepare(sql).run(...pks);
  }

  del<T extends Model>(o: Obj<T>) {
    const pk = getPrimaryKey(o.constructor.name) as keyof typeof o & string;
    if (!pk) return;
    const v = o[pk];
    const sql = `delete from ${o.constructor.name} where ${pk}=?`;
    return this.db.prepare(sql).run(v);
  }

  createTables() {
    type columnInfo = {
      name: string,
      type: string,
      unique: 0 | 1,
      notnull: 0 | 1,
      pk: 0 | 1
    }
    const exist = new Set(this.tables());
    let migration = 0;
    for (const s of tables) {
      const name = s.name;
      if (exist.has(name)) {
        const info = {} as { [key: string]: columnInfo };
        this.db.pragma(`table_info(${name})`).forEach((a: columnInfo) => info[a.name] = a);
        const idxInf = this.db.pragma(`index_list(${name})`);
        if (idxInf.length) {
          idxInf.forEach((a: { name: string, unique: boolean }) => {
            if (a && a.unique) {
              const i = this.db.pragma(`index_info(${a.name})`)[0] as columnInfo;
              info[i.name].unique = 1;
            }
          });
        }
        const o = new s();
        const same: string[] = [];
        for (const [k, v] of Object.entries(o)) {
          if (typeof v === "function" || k.startsWith("_")) continue;
          const cons = getConstraint(o, k);
          const type = getColumnType(v);
          const inf = info[k];
          if (inf) {
            const unique = +cons.has("UNIQUE");
            const notnull = +cons.has("NOT Null");
            const pk = +cons.has(primaryKey);
            if (inf.type === type
              && (!notnull || inf.notnull === notnull)
              && (!unique || inf.unique === unique)
              && (!pk || inf.pk === pk)
            ) {
              same.push(k);
            } else {
              migration = 1;
            }
          } else migration = 1;
        }
        if (migration) {
          const nm = name + "_" + randNum();
          const column = same.join();
          const ru = [
            `ALTER TABLE ${name} RENAME TO ${nm}`,
            createTable(s)
          ];
          if (column) ru.push(`INSERT INTO ${name} (${column}) SELECT ${column} FROM  ${nm}`);
          ru.push(`DROP TABLE ${nm}`);
          this.db.exec(ru.join(";"));
        }
      } else {
        this.db.exec(createTable(s));
      }
    }
  }

  dropTables() {
    for (const { name } of tables) {
      this.db.exec(`DROP TABLE IF EXISTS ${name}`);
    }
  }

  tables() {
    return this.db
      .prepare(
        `SELECT name FROM sqlite_schema WHERE 
            type ='table' AND name NOT LIKE 'sqlite_%';`
      )
      .all()
      .map((a) => a.name);
  }
}

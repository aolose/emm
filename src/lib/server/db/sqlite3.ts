import better from 'better-sqlite3';
import {noNullKeyValues, setKey, sqlVal, val} from '../utils';
import * as models from '../model';
import {getConstraint, getPrimaryKey, pkMap, primaryKey} from '../model/decorations';
import type {Class, dbHooks, Model, Obj} from "$lib/types";

const tables = Object.values(models);
const INTEGER = 'INTEGER';
const TEXT = 'TEXT';

// model
type M = typeof tables[number];

function createTable(Model: M) {
    const fields = [];
    const t = new Model();
    const e = Object.entries(t);
    const pk = [];
    for (const [k, v] of e) {
        if (typeof v === "function" || k[0] === '_') continue
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
    return `CREATE TABLE ${Model.name} (${fields.join()})`;
}

function select(obj: Obj<Model>) {
    const table = obj.constructor.name;
    const [k, v] = noNullKeyValues(obj);
    const where = k.length ? k.map((a) => `${a}=?`).join(' and ') : '';
    return [`SELECT * FROM ${table}`, where, v];
}

function insert(obj: Obj<Model>): [string, unknown[]] {
    const table = obj.constructor.name;
    const [k, m] = noNullKeyValues(obj);
    const v = sqlVal(m);
    const q = new Array(k.length).fill('?').join();
    return [`insert into ${table} (${k.join()}) values (${q})`, v];
}

function update(obj: Obj<Model>): [string, unknown[]] {
    const table = obj.constructor.name;
    const pk = getPrimaryKey(table) as string
    const [k, m] = noNullKeyValues(obj);
    const v = sqlVal(m);
    const w = []
    if (pk) {
        const i = k.indexOf(pk)
        w.push(k.splice(i, 1)[0])
        v.push(v.splice(i, 1)[0])
    }
    return [`update ${table} set ${k.map(a => `${a} = ?`).join()}${w.length ? ` where ${pk}=?` : ''}`, v]
}


export class DB {
    // expose for test
    db: better.Database;

    constructor(path = 'db') {
        this.db = new better(path);
        process.on('exit', () => this.db.close());
    }

    private select(one: boolean, o: Obj<Model>, where = '', values: unknown[]) {
        const [sql, w, v] = select(o);
        const wh = [w, where].filter((a) => a).join(' and ');
        const s = sql + (wh ? ` WHERE ${wh}` : '');
        const params = sqlVal([...v, ...values]);
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

    count(o: Class<Model>): number {
        return this.db.prepare(`select count(*) as c from ${o.name}`).get().c as number
    }

    page<T extends Model>(
        o: Class<T>,
        page: number,
        size: number,
        order = [] as string[],
        where?: [string, ...unknown[]],
    ) {
        const s = `select * from ${o.name}`
        const d = order.length ? ` order by ${order.join()}` : ''
        const l = ` limit ${size * (page - 1)},${size}`
        let sql = s + d + l
        if (where?.length) sql = `${sql} where ${where}`
        const p =  where?.slice(1)|| []
        return this.db.prepare(sql).all(...p) as T[]
    }

    save<T extends Model>(a: Obj<T>, create?: boolean,skipSave?:boolean) {
        const now = Date.now()
        const o = a as Obj<T> & dbHooks
        if (!skipSave&&o.onSave) {
            o.onSave(this, now)
        }
        const table = o.constructor.name
        setKey(o, 'save', now)
        const pk = getPrimaryKey(table) as keyof typeof o & string
        const kv = val(o[pk])
        let sql: string
        let values: unknown[]
        if (!kv || create) {
            setKey(o, 'createAt', now);
            [sql, values] = insert(o);
        } else [sql, values] = update(o);
        const r = this.db.prepare(sql).run(...values);
        if (r.changes === 1 && !kv) {
            const t = typeof kv
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            o[pk] = (t === 'number' || t === 'bigint') ? r.lastInsertRowid :
                this.db.prepare(`select ${pk} from ${table} where rowid=?`).get(r.lastInsertRowid)[pk]
        }
        return r
    }

    delByPk<T extends Model>(c: Class<T>, pks: unknown[]) {
        const pk = pkMap[c.name] as string
        const sql = `delete from ${c.name} where ${pk} in (${pks.map(a => '?').join()})`
        return this.db.prepare(sql).run(...pks)
    }

    del<T extends Model>(o: Obj<T>) {
        const pk = getPrimaryKey(o.constructor.name) as keyof typeof o & string
        if (!pk) return
        const v = o[pk]
        const sql = `delete from ${o.constructor.name} where ${pk}=?`
        return this.db.prepare(sql).run(v);
    }

    createTables() {
        const names = [] as string[];
        const exist = this.tables();
        for (const s of tables) {
            const name = s.name;
            if (exist.indexOf(name) === -1) {
                this.db.exec(createTable(s));
                names.push(name);
            }
        }
        return names;
    }

    dropTables() {
        for (const {name} of tables) {
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

import better from 'better-sqlite3';
import {noNullKeyValues, sqlVal} from '../utils';
import * as models from '../model';
import {getConstraint, getPrimaryKey, pkMap, primaryKey} from '../model/decorations';
import type {Class, Model} from "$lib/types";

const tables = Object.values(models);
const INTEGER = 'INTEGER';
const TEXT = 'TEXT';

interface svM extends Object {
    save: number
}

// model
type M = typeof tables[number];

function createTable(Model: M) {
    const fields = [];
    const t = new Model();
    const e = Object.entries(t);
    const pk = [];
    for (const [k, v] of e) {
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

function select(obj: object) {
    const table = obj.constructor.name;
    const [k, v] = noNullKeyValues(obj);
    const where = k.length ? k.map((a) => `${a}=?`).join(' and ') : '';
    return [`SELECT * FROM ${table}`, where, v];
}

function insert(obj: object): [string, unknown[]] {
    const table = obj.constructor.name;
    const [k, m] = noNullKeyValues(obj);
    const v = sqlVal(m);
    const q = new Array(k.length).fill('?').join();
    return [`replace into ${table} (${k.join()}) values (${q})`, v];
}

export class DB {
    // expose for test
    db: better.Database;

    constructor(path = 'db') {
        this.db = new better(path);
        process.on('exit', () => this.db.close());
    }

    private select(one: boolean, o: object, where = '', values: unknown[]) {
        const [sql, w, v] = select(o);
        const wh = [w, where].filter((a) => a).join(' and ');
        const s = sql + (wh ? ` WHERE ${wh}` : '');
        const params = sqlVal([...v, ...values]);
        const paper = this.db.prepare(s);
        if (one) return paper.get(...params);
        return paper.all(...params);
    }

    get<T extends object>(o: T, where?: string, ...values: unknown[]) {
        return this.select(true, o, where, values) as T | undefined;
    }

    all<T extends object>(o: T, where?: string, ...values: unknown[]) {
        return this.select(false, o, where, values) as T[];
    }

    count(o: Class<Model>): number {
        return this.db.prepare(`select count(*) as c from ${o.name}`).get().c as number
    }

    page<T extends Model>(o: Class<T>, page: number, size: number, order = [] as string[]) {
        // todo
        const s = `select * from ${o.name}`
        const d = order.length ? ` order by ${order.join()}` : ''
        const l = ` limit ${page * size} offset ${size * (page - 1)}`
        return this.db.prepare(s + d + l).all() as T[]
    }

    save<T extends object>(o: T) {
        if (Object.hasOwn(o, 'save')) {
            (o as svM).save = Date.now()
        }
        const [sql, values] = insert(o);
        const r = this.db.prepare(sql).run(...values);
        if (r.changes === 1) {
            const pk = getPrimaryKey(o)
            const t = typeof o[pk]
            if (t === 'number' || t === 'bigint') {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                o[pk] = r.lastInsertRowid
            }
        }
        return r
    }

    delByPk<T extends Model>(c:Class<T>, pks:unknown[]){
        const pk = pkMap[c.name]
        const sql = `delete from ${c.name} where ${pk} in (${pks.map(a=>'?').join()})`
        return this.db.prepare(sql).run(...pks)
    }

    del<T extends object>(o: T) {
        const pk = getPrimaryKey(o)
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

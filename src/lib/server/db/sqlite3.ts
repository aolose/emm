import sqlite3 from 'better-sqlite3';
import {Log, noNullKeyValues} from '../utils';
import * as models from '../model';
import {getConstraint, primaryKey} from '../model/decorations';
import type {Model} from '$lib/types';

const tables = Object.values(models);
const INTEGER = 'INTEGER';
const TEXT = 'TEXT';

// model
type M = typeof tables[number];

function createTable(Model: M) {
    const fields = [];
    const t = new Model();
    const e = Object.entries(t);
    const pk = []
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
        const s = [...getConstraint(t, k)]
        const pi = s.indexOf(primaryKey)
        if (pi !== -1) {
            s.splice(pi, 1)
            pk.push(k)
        }
        const constraint = s.join(' ') || '';
        fields.push(`${k} ${type} ${constraint}`);
    }
    if (pk.length) {
        fields.push(`PRIMARY KEY (${pk.join()})`)
    }
    const sql = `CREATE TABLE ${Model.name} (${fields.join()})`;
    Log.debug('sql', sql)
    return sql
}

function select(obj: Model) {
    const table = obj.constructor.name;
    const [k, v] = noNullKeyValues(obj);
    const where = k.length ? k.map((a) => `${a}=?`).join(' and ') : '';
    return [`SELECT * FROM ${table}`, where, v];
}

function insert(obj: Model): [string, unknown[]] {
    const table = obj.constructor.name;
    const [k, v] = noNullKeyValues(obj);
    const q = new Array(k.length).fill('?').join();
    return [`replace into ${table} (${k.join()}) values (${q})`, v];
}

export class DB {
    // expose for test
    db: sqlite3.Database;

    constructor(path = 'db') {
        this.db = new sqlite3(path);
        process.on('exit', () => this.db.close());
    }

    private select(one: boolean, o: Model, where = '', values: unknown[]) {
        const [sql, w, v] = select(o);
        const wh = [w, where].filter((a) => a).join(' and ');
        const s = sql + (wh ? ` WHERE ${wh}` : '');
        const params = [...v, ...values];
        const paper = this.db.prepare(s)
        if (one) return paper.get(...params)
        return paper.all(...params)
    }

    get<T extends Model>(o: T, where?: string, ...values: unknown[]) {
        return this.select(true, o, where, values) as T | undefined;
    }

    all<T extends Model>(o: T, where?: string, ...values: unknown[]) {
        return this.select(false, o, where, values) as T[];
    }

    save<T extends Model>(o: T) {
        const [sql, values] = insert(o);
        return this.db.prepare(sql).run(...values)
    }

    createTables() {
        const names = [] as string[];
        const exist = this.tables()
        for (const s of tables) {
            const name = s.name
            if(exist.indexOf(name)===-1){
                this.db.exec(createTable(s))
                names.push(name)
            }
        }
        return names
    }

    dropTables() {
        const names = [] as string[];
        for (const {name} of tables) {
            const {changes} = this.db.prepare(`DROP TABLE IF EXISTS ${name}`).run();
            if (changes) names.push(name)
        }
    }

    tables() {
        return this.db.prepare(
            `SELECT name FROM sqlite_schema WHERE 
            type ='table' AND name NOT LIKE 'sqlite_%';`
        ).all().map(a=>a.name)
    }
}

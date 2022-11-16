import sqlite3 from 'sqlite3'
import {getQueryResult, getRunResult, is_dev, noNullKeyValues, waitFinish} from "../utils";
import * as models from '../model'
import {getConstraint} from "../model/decorations";
import type {Model} from "../types";

const {Database, verbose} = sqlite3
const tables = Object.values(models)
const INTEGER = 'INTEGER'
const TEXT = 'TEXT'

// model
type M = typeof tables[number]

function createTable(Model: M) {
    const fields = []
    const t = new Model()
    const e = Object.entries(t)
    for (const [k, v] of e) {
        let type = 'BLOB'
        const t = v?.constructor?.name;
        switch (t) {
            case 'Number':
            case 'Boolean':
            case 'Date':
                type = INTEGER;
                break
            case 'String':
                type = TEXT;
                break
        }
        const constraint = [...getConstraint(t, k)].join(' ') || ''
        fields.push(`${k} ${type} ${constraint}`)
    }
    return `CREATE TABLE if not exists ${Model.name}
            (
                ${fields.join()}
            )`
}


function select(obj: Model) {
    const table = obj.constructor.name
    const [k, v] = noNullKeyValues(obj)
    const where = k.length ? k.map(a => `${a}=?`).join(' and ') : ''
    return [`SELECT *
             FROM ${table}`, where, v]
}

function insert(obj: Model): [string, unknown[]] {
    const table = obj.constructor.name
    const [k, v] = noNullKeyValues(obj)
    const q = new Array(k.length).fill('?').join()
    return [`replace
    into
    ${table}
    (
    ${k.join()}
    )
    values
    (
    ${q}
    )`, v]
}

export class DB {
    // expose for test
    db: sqlite3.Database;

    constructor(path = 'db') {
        const D = is_dev ? verbose().Database : Database
        this.db = new D(path)
    }


    private select(one: boolean, o: Model, where = '', values: unknown[]) {
        const [sql, w, v] = select(o)
        const wh = [w, where].filter(a => a).join(' and ')
        const s = sql + (wh ? ` WHERE ${wh}` : '');
        const params = [...v, ...values]
        if (one) return getQueryResult<Model>((cb) => this.db.get(s, params, cb))
        return getQueryResult<Model[]>((cb) => this.db.all(s, params, cb))
    }

    get<T extends Model>(o: T, where?: string, ...values: unknown[]) {
        return this.select(true, o, where, values) as Promise<T>
    }

    all<T extends Model>(o: T, where?: string, ...values: unknown[]) {
        return this.select(false, o, where, values) as Promise<T[]>
    }

    save<T extends Model>(o: T) {
        const [sql, values] = insert(o)
        return getRunResult(o, cb => {
            this.db.run(sql, values, cb)
        })
    }

    createTables() {
        const names = [] as string[]
        return waitFinish<string[]>(tables.length, done => {
            for (const s of tables) {
                this.db.run(createTable(s), () => {
                    names.push(s.name)
                    done(names)
                })
            }
        })
    }

    dropTables() {
        const names = [] as string[]
        return waitFinish<string[]>(tables.length, done => {
            for (const {name} of tables) {
                this.db.run(`DROP TABLE IF EXISTS ${name}`)
                done(names)
            }
        })
    }

    close() {
        this.db.close()
    }
}




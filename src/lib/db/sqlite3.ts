import sqlite3 from 'sqlite3'
import {is_dev, waitFinish} from "../utils";
import * as models from '../model'

const {Database, verbose} = sqlite3
const tables = Object.values(models)
const INTEGER = 'INTEGER'
const TEXT = 'TEXT'

interface ClassRef<T> {
    new(): T
}

function createTable<T extends object>(Model: ClassRef<T>) {
    const fields = []
    const e = Object.entries(new Model())
    for (const [k, v] of e) {
        let type = 'BLOB'
        const t = v?.constructor?.name;
        if (k === 'id' && type === INTEGER) {
            fields.unshift(k + ' INTEGER AUTOINCREMENT')
            continue
        }
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
        fields.push(`${k} ${type}`)
    }
    return `CREATE TABLE if not exists ${Model.name}
            (
                ${fields.join()}
            )`
}


export class DB {
    // expose for test
    db: sqlite3.Database;

    constructor(path = 'db') {
        const D = is_dev ? verbose().Database : Database
        this.db = new D(path)
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
        return waitFinish(tables.length, done => {
            for (const {name} of tables) {
                this.db.run(`DROP TABLE IF EXISTS ${name}`)
                names.push(name)
                done(names)
            }
        })
    }

    close() {
        this.db.close()
    }
}

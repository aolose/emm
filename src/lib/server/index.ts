import {DB} from "./db/sqlite3";
import type {Model} from "./types";
import {modelCache} from "./cache";
import {runJobs} from "./db/jobs";
import {Log, noNullKVs} from "./utils";
import {System} from "./model";

const db = new DB()
const sys = new System()

db.createTables().then(tables => {
    Log.debug('init tables', tables)
})

runJobs()


type  token = string
const Pools = {}

type Filter = {
    page: 1,
    size: 10,
}

function genModelFilterKey(m: Model, f?: Filter): string {
    const n = [m.constructor.name] as unknown[]
    const [k1, v1] = noNullKVs(m)
    const k2 = f ? Object.values(f) : []
    return n.concat(k1, v1, k2).join('')
}

function limit(f: Filter): string {
    return `LIMIT ${f.page * f.size},${f.size}`
}

export const server = {

    sync() {
        // todo
    },
    auth(token: string) {
        return server
    },
    count(m: Model) {
        //todo
    },
    load(model: Model, filter?: Filter | number, cacheTime?: number) {
        if (typeof filter === "number") {
            cacheTime = filter;
            filter = undefined
        }

        function load() {
            if (typeof filter === 'object') return db.all(model, limit(filter))
            else return db.get(model)
        }

        return modelCache(load, cacheTime, genModelFilterKey(model, filter))
    }
}

import {DB} from './db/sqlite3';
import type {Model} from '../types';
import {modelCache} from './cache';
import {runJobs} from './db/jobs';
import {Log, noNullKeyValues} from './utils';
import {System} from './model';

export const sys = new System();
runJobs();

type token = string;
const Pools = {};

type Filter = {
    page: 1;
    size: 10;
    desc: 'publish';
};

// todo desc
function genModelFilterKey(m: Model, f?: Filter): string {
    const n = [m.constructor.name] as unknown[];
    const [k1, v1] = noNullKeyValues(m);
    const k2 = f ? Object.values(f) : [];
    return n.concat(k1, v1, k2).join('');
}

function limit(f: Filter): string {
    return `LIMIT ${f.page * f.size},${f.size}`;
}

export let db: DB
export const server = {
    start() {
        db = new DB();
        const tables = db.createTables()
        Log.debug('create:', tables);
        Log.debug('tables:', db.tables())
    },
    sync() {
        // todo
    },
    auth(token: string) {
        return server;
    },
    count(m: Model) {
        //todo
    },
    load(model: Model, filter?: Filter | number, cacheTime?: number) {
        if (typeof filter === 'number') {
            cacheTime = filter;
            filter = undefined;
        }

        function load() {
            if (typeof filter === 'object') return db.all(model, limit(filter));
            else return db.get(model);
        }

        return modelCache(load, cacheTime, genModelFilterKey(model, filter));
    }
};

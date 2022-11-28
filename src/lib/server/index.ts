import {DB} from './db/sqlite3';
import type {Model} from '../types';
import {modelCache} from './cache';
import {runJobs} from './db/jobs';
import {DBProxy, noNullKeyValues, val} from './utils';
import {System} from './model';

export let sys: System;
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


export let db: DB;
export const server = {
    start() {
        console.log('server start');
        if (!db) db = new DB();
        db.createTables();
        sys = DBProxy(new System());
        const {uploadDir, thumbDir} = sys
        if (!val(uploadDir)) sys.uploadDir = '/res'
        if (!val(thumbDir)) sys.thumbDir = '/thumb'
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
    // load(model: Model, filter?: Filter | number, cacheTime?: number) {
    //     if (typeof filter === 'number') {
    //         cacheTime = filter;
    //         filter = undefined;
    //     }
    //
    //     function load() {
    //         if (typeof filter === 'object') return db.all(model, limit(filter));
    //         else return db.get(model);
    //     }
    //
    //     return modelCache(load, cacheTime, genModelFilterKey(model, filter));
    // }
};

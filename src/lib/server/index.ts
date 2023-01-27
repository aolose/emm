import {DB} from './db/sqlite3';
import {runJobs} from './db/jobs';
import {DBProxy, model} from './utils';
import {Require, System, Tag} from './model';
import {publishedPost, tags} from "$lib/server/store";
import {loadGeoDb} from "$lib/server/ipLite";
import {reqPostCache, requireMap} from "$lib/server/cache";

export let sys: System;
runJobs();
export let db: DB;
export const server = {
    start(path: string) {
        if (db) return
        try {
            console.log('server start');
            db = new DB(path);
            db.createTables();
            sys = DBProxy(System);
            this.sync()
            loadGeoDb()
        } catch (e) {
            if (db) db.db.close();
            (db as DB | null) = null;
            (sys as System | null) = null;
            const er = e?.toString()
            console.log(er)
            return er
        }
    },
    sync() {
        const ts = db.db.prepare('select * from Tag order by createAt desc').all()
        tags.set(ts.map(a => DBProxy(Tag, a, false)))
        publishedPost.set(new Set(
            db.db.prepare('select id from Post where published =?')
                .all(1).map(a => +a.id)))
        db.all(model(Require)).forEach(r=>{
            requireMap.set(r.id,DBProxy(Require,r,false))
        })
        reqPostCache.load()
    }
};

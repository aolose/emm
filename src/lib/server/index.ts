import {DB} from './db/sqlite3';
import {runJobs} from './db/jobs';
import {DBProxy, val} from './utils';
import {System, Tag} from './model';
import {tags} from "$lib/store";
import {loadGeoDb} from "$lib/server/ipLite";

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
        // const {uploadDir, thumbDir,ipLiteToken} = sys
        // if (!val(uploadDir)) sys.uploadDir = '/res'
        // if (!val(thumbDir)) sys.thumbDir = '/thumb'
        // if (!val(ipLiteToken)) sys.ipLiteToken = 'p2FQqUZE4YOZtlv1VuZ5oonLwFA9wUA1BoC0hfkF3dzepkskUz8P9RSwdeYhIinG'

    },
    sync() {
        tags.set(db.all(new Tag()).map(a => DBProxy(Tag, a, false)))
        // todo
    }
};

import {DB} from './db/sqlite3';
import {runJobs} from './db/jobs';
import {DBProxy, val} from './utils';
import {System, Tag} from './model';
import {tags} from "$lib/store";

export let sys: System;
runJobs();

export let db: DB;
export const server = {
    start() {
        console.log('server start');
        if (!db) db = new DB();
        db.createTables();
        sys = DBProxy(System);
        const {uploadDir, thumbDir} = sys
        if (!val(uploadDir)) sys.uploadDir = '/res'
        if (!val(thumbDir)) sys.thumbDir = '/thumb'
        this.sync()
    },
    sync() {
        tags.set(db.all(new Tag()).map(a=>DBProxy(Tag,a,false)))
        // todo
    }
};

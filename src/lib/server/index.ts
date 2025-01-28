import { DB } from './db/sqlite3';
import { checkStatue, DBProxy, model } from './utils';
import { Post, Require, System, Tag } from './model';
import { publishedPost, tags } from '$lib/server/store';
import { loadGeoDb } from '$lib/server/ipLite';
import { codeTokens, reqPostCache, requireMap, tagPostCache } from '$lib/server/cache';
import { loadRules } from '$lib/server/firewall';
import { sitemap } from '$lib/sitemap';
import { loadPuv } from '$lib/server/puv';
import { cmManager } from '$lib/server/comment';
import { resolve } from 'path';

export let sys: System;
export let db: DB;
export const server = {
  maintain: false,
  start(path: string) {
    if (sys && db) return;
    if (path !== ':memory:' && path) {
      path = resolve(path);
    }
    try {
      if (db?.db) {
        db.db.close();
      }
      db = new DB(path);
      console.log('server start');
      db.createTables();
      sys = DBProxy(System);
      this.sync();
      loadGeoDb();
      // readRes()
      this.maintain = false;
    } catch (e) {
      this.stop();
      const er = e?.toString();
      console.log(er);
      return er;
    }
  },
  sync() {
    const ts = db.db.prepare('select * from Tag order by createAt desc').all() as Tag[];
    tags.set(ts.map((a) => DBProxy(Tag, a, false)));
    requireMap.clear();
    cmManager.clear();
    tagPostCache.load();
    publishedPost.set(
      new Set(
        db.db
          .prepare('select id from Post where published=?')
          .all(1)
          .map((a) => +(a as Post).id)
      )
    );
    db.all(model(Require)).forEach((r) => {
      requireMap.set(r.id, DBProxy(Require, r, false));
    });
    codeTokens.load();
    reqPostCache.load();
    loadRules();
    checkStatue();
    sitemap.refresh();
    loadPuv();
    // readRes();
  },
  stop() {
    this.maintain = true;
    if (db) db.db.close();
    (db as DB | null) = null;
    (sys as System | null) = null;
  }
};

import type { Require } from "$lib/server/model";
import { CmUser, Comment, Post, PostTag, RequireMap, Tag, TokenInfo } from "$lib/server/model";
import type { Client } from "$lib/server/client";
import { DBProxy, model, } from "$lib/server/utils";
import { db } from "$lib/server/index";
import { requireType } from "$lib/server/enum";
import type { DiffFn, Model, Obj } from "$lib/types";
import { tags } from "$lib/server/store";
import { diffStrSet } from "$lib/setStrPatchFn";
import { get } from "svelte/store";
import { permission } from "$lib/enum";

export const requireMap = new Map<number, Require>();

export const clientMap = new Map<string, Client>();

export const tagPostCache = (() => {
  let tps: PostTag[] = [];
  return {
    load() {
      tps = db.all(model(PostTag));
    },
    delete(postId?: number | number[], tagId?: number | number[]) {
      const ids = new Set<number>();
      const pSet = new Set(([] as number[]).concat(postId || []));
      const tSet = new Set(([] as number[]).concat(postId || []));
      tps.forEach(({ postId, tagId, id }) => {
        if ((!pSet.size || pSet.has(postId)) || (!tSet.size || tSet.has(tagId))) {
          ids.add(id);
        }
      });
      tps = tps.filter(a => !ids.has(a.id));
      db.delByPk(PostTag, [...ids]);
    },
    setTags(postId: number, tagStr: string[]) {
      const pTags = this.getTags(postId);
      const ts = new Set(tagStr);
      const ids: number[] = [];
      pTags.forEach(a => {
        if (ts.has(a.name)) {
          ts.delete(a.name);
        } else {
          ids.push(a.id);
        }
      });
      if (ts.size) {
        const add: string[] = [];
        get(tags).forEach(t => {
          if (ts.has(t.name)) {
            tps.push(DBProxy(PostTag, { postId, tagId: t.id }));
            ts.delete(t.name);
          }
        });
      }
      if (ts.size) {
        for (const t of ts) {
          const nt = DBProxy(Tag, { name: t });
          tags.update(ts => ts.concat(nt));
          tps.push(DBProxy(PostTag, { postId, tagId: nt.id }));
        }
      }
      if (ids.length) {
        this.delete(postId, ids);
      }
    },
    setPosts(tagId: number, postId: number[]) {
      const pSet = new Set(this.getPostIds(tagId));
      postId.forEach(p => {
        if (pSet.has(p)) pSet.delete(p);
        else {
          tps.push(DBProxy(PostTag, { postId: p, tagId }));
        }
        if (pSet.size) {
          this.delete([...pSet], tagId);
        }
      });

    },
    getTags(postId: number | number[]) {
      const ids: Set<number> = new Set();
      const pSet = new Set(([] as number[]).concat(postId));
      tps.forEach(a => {
        if (pSet.has(a.postId)) ids.add(a.tagId);
      });
      return get(tags).filter(a => ids.has(a.id));
    },
    getPostIds(tagId: number) {
      return tps.filter(a => a.tagId === tagId).map(a => a.postId);
    }
  };
})();

export const codeTokens = (() => {
  const o = new Map<string, Obj<TokenInfo>>();

  return {
    load() {
      const n = Date.now();
      const ids: number[] = [];
      db.all(model(TokenInfo)).forEach(a => {
        if (+a.expire > 0 && a.expire < n) ids.push(a.id);
        else if (a.code) {
          codeTokens.add(a.code, model(TokenInfo, a));
        }
      });
      if (ids.length) db.delByPk(TokenInfo, ids);
    },
    add(code: string, token: Obj<TokenInfo>) {
      o.set(code, token);
      db.save(token);
      return token;
    },
    has(code: string) {
      return o.has(code);
    },
    get(code: string) {
      return o.get(code);
    },
    delete(filter: { code?: string, id?: number[] }) {
      const { code, id } = filter;
      const codes: string[] = [];
      const ids: number[] = [];
      if (code) codes.push(code);
      if (id) {
        ids.push(...id);
        for (const [k, v] of o) {
          if (ids.includes(v.id as number)) {
            codes.push(k);
          }
        }
      }
      codes.forEach(c => o.delete(c));
      return db.delByPk(TokenInfo, ids).changes;
    }
  };
})();


export const reqPostCache = (() => {
  let c: RequireMap[] = [];
  return {
    load() {
      c = db.all(model(RequireMap, { type: requireType.Post }));
    },
    setPosts(reqId: number, postId: number[]) {
      const { add, del } = (diffStrSet as DiffFn<Set<number>>)(new Set(c.map(a => a.targetId)), new Set(postId));
      if (del) reqPostCache.rm({ postId: [...del], reqId });
      [...add].forEach(i => {
        reqPostCache.add(i, reqId);
      });
    },
    setReqs(postId: number, reqId: number[]) {
      const { add, del } = (diffStrSet as DiffFn<Set<number>>)(new Set(c.map(a => a.targetId)), new Set(reqId));
      if (del) reqPostCache.rm({ postId, reqId: [...del] });
      [...add].forEach(i => {
        reqPostCache.add(postId, i);
      });
    },
    add(postId: number, reqId: number) {
      if (!c.find(a => a.reqId === reqId && a.targetId === postId)) {
        const n = model(RequireMap, {
          reqId,
          targetId: postId,
          type: requireType.Post
        }) as RequireMap;

        db.save(n, { create: true });
        c = c.concat(n);
      }
    },
    get(rq: { postId?: number, reqId?: number } = {}) {
      const { postId, reqId } = rq;
      return c.filter(a => {
        if ((postId && postId !== a.targetId) || (reqId && reqId !== a.reqId)) {
          return false;
        }
        return true;
      });
    },
    rm(rq: { postId?: number | number[], reqId?: number | number[] } = {}) {
      const { postId, reqId } = rq;
      const pSet = new Set(([] as number[]).concat(postId || []));
      const rSet = new Set(([] as number[]).concat(reqId || []));
      const ks: number[] = [];
      c = c.filter(a => {
        if ((!postId || pSet.has(a.targetId)) && (!reqId || rSet.has(a.reqId))) {
          ks.push(a.id);
          return false;
        }
        return true;
      });
      if (ks.length) {
        db.delByPk(RequireMap, ks);
      }
      return ks;
    }
  };
})();
type pagePatch<T> = (m: T[]) => T[]
export const combine = <T extends Model>(...fns: pagePatch<T>[]) => (items: T[]) => {
  fns.forEach(fn => items = fn(items));
  return items;
};
export const patchPostTags = (ps: Post[]) => ps.map(a => {
  const tags = tagPostCache.getTags(a.id);
  if (tags.length) a._tag = tags.map(n => n.name).join();
  return a;
});
export const patchPostReqs = (ps: Post[]) => ps.map(a => {
  a._reqs = reqPostCache.get({ postId: a.id }).map(n => ({
    id: n.reqId,
    name: requireMap.get(n.reqId)?.name || ""
  }));
  return a;
});


export const noAccessPosts = (cli?: Client) => {
  const posts = new Set(reqPostCache.get().map(a => a.targetId).filter(a => +a));
  if (cli) {
    cli.clear();
    const p = cli.tokens.get(permission.Post);
    if (p instanceof Map) for (const [k] of p) {
      posts.delete(k);
    }
  }
  const s = posts.size;
  return s ? [...posts] : undefined;
};
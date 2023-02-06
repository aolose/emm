import type { Require } from "$lib/server/model";
import type { Client } from "$lib/server/client";
import { RequireMap, TokenInfo } from "$lib/server/model";
import { model } from "$lib/server/utils";
import { db } from "$lib/server/index";
import { requireType } from "$lib/server/enum";
import type { DiffFn, Obj } from "$lib/types";
import { codes } from "$lib/server/store";
import type { ArgumentTypes, func } from "../types";
import { diffStrSet } from "$lib/setStrPatchFn";


export const requireMap = new Map<number, Require>();

export const clientMap = new Map<string, Client>();

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
    get(rq: { postId?: number, reqId?: number }) {
      const { postId, reqId } = rq;
      return c.filter(a => {
        if ((postId && postId !== a.targetId) || (reqId && reqId !== a.reqId)) {
          return false;
        }
        return true;
      });
    },
    rm(rq: { postId?: number | number[], reqId?: number | number[] }) {
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
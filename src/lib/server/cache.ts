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

const addHook = <T extends object>(o: T, method: keyof T | (keyof T)[], fn: func) => {
  ([] as (keyof T)[]).concat(method).forEach(name => {
    const ori = o[name] as (...params: unknown[]) => unknown;
    if (typeof ori === "function") {
      type args = ArgumentTypes<typeof ori>
      (o[name] as func) = function(...params: args) {
        const r = ori.call(o, ...params);
        fn(name, ...params);
        return r;
      };
    }
  });
  return o;
};

export const requireMap = new Map<number, Require>();

export const clientMap = new Map<string, Client>();
let saveDb = 0;

export function loadCodeTokens() {
  saveDb = 0;
  codeTokens.clear();
  db.all(model(TokenInfo)).forEach(a => {
    if (a.code) {
      codeTokens.set(a.code, model(TokenInfo, a));
    }
  });
  saveDb = 1;
}

export const codeTokens = addHook(
  new Map<string, Obj<TokenInfo>>(),
  ["set", "delete"],
  (name, ...params) => {
    const tk = (params as TokenInfo[])[0] as TokenInfo;
    if (name === "set") {
      if (!saveDb) db.save(tk);
    } else if (name === "delete") {
      if (tk.id) db.delByPk(TokenInfo, [tk.id]);
    }
    codes.set(new Set(codeTokens.keys()));
  }
);

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
      let n = 0;
      if (ks.length) {
        n = db.delByPk(RequireMap, ks).changes;
      }
      return n;
    }
  };
})();
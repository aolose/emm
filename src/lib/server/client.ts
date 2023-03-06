import { randomUUID } from "crypto";
import { clientMap } from "$lib/server/cache";
import { permission } from "$lib/enum";
import type { TokenInfo } from "$lib/server/model";
import type { Obj } from "$lib/types";
import { debugMode, model } from "$lib/server/utils";
import { TkTick } from "$lib/server/model";
import { db } from "$lib/server/index";

const hasReqClean = 1e3 * 3600 * 24 * 60; // 60days
const empClean = 1e3 * 60;
export class Client {
  constructor(skip?: boolean, uuid?: string) {
    this.tokens = new Map();
    this.destroy = Date.now() + empClean;
    if (!skip) clientMap.set(
      this.uuid = uuid || randomUUID(),
      this
    );
  }

  destroy = 0;
  lastAct = 0;
  disable = false;
  uuid = "";
  tokens: Map<permission, Map<number, number> | number>;

  getReqs() {
    this.clear();
    const t = this.tokens.get(permission.Post);
    if (t && t instanceof Map) {
      return t;
    }
  }

  has(tk: { type: permission, _reqs?: number[] } | Obj<TokenInfo>) {
    this.clear();
    const { type, _reqs } = tk;
    if (type === undefined) return false;
    const t = this.tokens.get(type);
    if (t) {
      if (type === permission.Admin) {
        return true;
      }
      if (_reqs) {
        for (const r of _reqs) {
          const v = (t as Map<number, number>).get(r);
          if (!v) return false;
        }
        return true;
      }
    }
    return false;
  }

  addToken(tk: TokenInfo,skip=false) {
    this.clear();
    const { expire, _reqs, type } = tk;
    if (type === permission.Admin) {
      for (const cli of clientMap.values()) {
        cli.rmPermission(type);
      }
    }
    if (type == permission.Read || type === permission.Admin)
      this.tokens.set(type, expire || -1);
    if (type === permission.Post) {
      let ct = this.tokens.get(tk.type);
      if (!ct && _reqs?.size) {
        this.tokens.set(type, ct = new Map());
        for (const c of _reqs) {
          const e = ct.get(c) || 0;
          if (e !== -1) ct.set(c, Math.max(expire, e) || -1);
        }
      }
    }
    if (!skip&&tk.code) {
      const t = model(TkTick, { token: this.uuid, ticket: tk.code });
      const h = db.get(t);
      if (!h) db.save(t, { create: true });
    }
    this.destroy = Date.now() + hasReqClean;
  }

  rmPermission(p: permission) {
    this.tokens.delete(p);
  }

  ok(p: permission) {
    this.clear();
    if (debugMode) return true;
    return !!this.tokens.get(p);
  }

  clear() {
    const n = Date.now();
    let keep = 0;
    for (const [k, v] of this.tokens) {
      const m = v as Map<number, number>;
      switch (k) {
        case permission.Admin:
        case permission.Read:
          if (v > -1 && v < n) this.tokens.delete(permission.Admin);
          else keep = 1;
          break;
        case permission.Post:
          for (const [a, b] of m) {
            if (b !== -1 && b < n) m.delete(a);
            else keep = 1;
          }
          if (!m.size) this.tokens.delete(k);
      }
    }
    this.destroy = n + (keep ? hasReqClean : empClean);
    return keep;
  }
}
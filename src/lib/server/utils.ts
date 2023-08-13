import { NULL } from "./enum";
import { contentType, dataType, encryptIv, encTypeIndex, geTypeIndex, permission } from "../enum";
import Pinyin from "tiny-pinyin";
import cookie from "cookie";
import type { CookieSerializeOptions } from "cookie";
import type { Api, ApiData, ApiName, Class, Model, Obj, Timer } from "../types";
import apis from "./api";
import {
  arrFilter,
  data2Buf,
  decryptReq,
  delay,
  diffObj,
  encrypt,
  encryptHeader,
  filter,
  getErr,
  getKINums,
  hasOwnProperty,
  parseBody,
  randNum
} from "../utils";
import { keyPool } from "./crypto";
import { getPrimaryKey } from "./model/decorations";
import { db, server, sys } from "./index";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { RequestEvent } from "@sveltejs/kit";
import { clientMap } from "$lib/server/cache";
import { Client } from "$lib/server/client";
import type { TokenInfo } from "$lib/server/model";
import { writable } from "svelte/store";
import type { Unsubscriber, Writable } from "svelte/types/runtime/store";
import fse from "fs-extra";
import JSZip from "jszip";
import type { Post } from "$lib/server/model";

export const is_dev = process.env.NODE_ENV !== "production";

export const sqlVal = (values: unknown[]) =>
  values.map((a) => {
    const t = typeof a;
    switch (t) {
      case "boolean":
        return +(a as boolean);
      case "object":
        if (a instanceof Date) return a.getTime();
    }
    return a;
  });

export function noNullKeyValues(o: Obj<Model>) {
  const C = o.constructor as Class<Model>;
  const ks = new Set<string>(Object.keys(new C() as object) as (keyof Model)[]);
  const keys = [] as string[];
  const values = [] as unknown[];
  const { TEXT, INT, DATE } = NULL;
  Object.entries(o).forEach(([k, v]) => {
    if (k[0] === "_" && !ks.has(k[0])) return;
    if (v !== undefined && v !== null) {
      const t = v.constructor.name;
      switch (t) {
        case "Boolean":
          break;
        case "String":
          if (v === TEXT) return;
          break;
        case "Number":
          if (v === INT) return;
          break;
        case "Date":
          if ((v as Date).getTime() === DATE.getTime()) return;
          break;
        default:
          return;
      }
    }
    if (v === undefined) v = null;
    keys.push(k);
    values.push(v);
  });
  return [keys, values];
}

function now() {
  return `[${new Date().toLocaleString()}]`;
}

export const Log = {
  debug(label: string, ...params: unknown[]) {
    if (is_dev) console.log(now(), "\x1b[36m", label, "\x1b[0m", ...params);
  },
  info(label: string, ...params: unknown[]) {
    console.log(now(), "\x1b[30m", label, "\x1b[0m", ...params);
  },
  warn(label: string, ...params: unknown[]) {
    console.warn(now(), label, ...params);
  },
  error(label: string, ...params: unknown[]) {
    console.error(now(), label, ...params);
  }
};

export const val = (a: unknown) => {
  if (a === undefined || a === null) return null;
  const t = a.constructor.name;
  switch (t) {
    case "String":
      if (a === NULL.TEXT) return null;
      break;
    case "Number":
      if (a === NULL.INT) return null;
      break;
    case "Date":
      if (a === NULL.DATE) return null;
      break;
  }
  return a;
};

export const resp = (body: ApiData, code = 200, headers: { [key: string]: string } = {}) => {
  const [tp, data] = parseBody(body);
  if (code >= 400) {
    Log.debug("error", code, data);
  }
  return new Response(data as BodyInit, {
    status: code,
    headers: new Headers({
      [contentType]: tp,
      ...headers
    })
  });
};

export const getShareKey = (req: Request) => {
  const enc = encryptHeader(req);
  if (enc) {
    const [num] = getKINums(enc);
    return keyPool.get(num)?.[0];
  }
};

export function slugGen(title: string) {
  return Pinyin.convertToPinyin(title, "", true)
    .replace(/ /g, "-")
    .replace(/[^0-9a-z!@#$&*()_\-+=~]+/gi, "-")
    .replace(/_+$/, "");
}

export const uniqSlug = (id: number, slug: string) => {
  const params = [`slug%`] as unknown[];
  let sql = `select slug from post where slug like ?`;
  if (id) {
    sql = `${sql} and id != ?`;
    params.push(id);
  }
  const slugs = db.db
    .prepare(sql)
    .all(...params)
    .map((a) => (a as Post).slug);
  if (slugs.length) {
    const n = slugs
      .map((a) => +a.replace(slug, ""))
      .filter((a) => a)
      .reduce((a, b) => (a > b ? a : b));
    return `${slug}-${n}`;
  }
};

export const setNull = <T extends object>(o: T, key: string) => {
  (o as { [key: string]: unknown })[key] = null;
};

export const getReqJson = async (req: Request) => {
  const shareKey = getShareKey(req);
  const decBuf = shareKey && (await decryptReq(req, shareKey, true));
  if (decBuf) return decBuf.json();
  return await req.json();
};

export const encryptResp = async (params: ApiData, keyNum: number, code = 200) => {
  const sk = keyPool.get(keyNum)?.[0];
  if (sk) {
    const [tp, data] = parseBody(params);
    if (data) {
      const num = randNum();
      const headers = new Headers({
        [contentType]: dataType.binary,
        [encTypeIndex]: geTypeIndex(tp),
        [encryptIv]: num.toString(36)
      });
      const bs = data2Buf(data);
      if (bs) {
        const buf = await encrypt(bs, num, sk);
        return new Response(buf, {
          status: code,
          headers
        });
      }
    }
  }
  return resp("", 500);
};
export const getIp = (req: Request) => req.headers.get("x-forwarded-for") || "";
export const apiHandle = async (event: RequestEvent): Promise<Response> => {
  const { request, params } = event;
  const name = params.api as ApiName;
  const m = request.method.toLowerCase() as keyof Api;
  const api = apis[name]?.[m];
  if (api) {
    const ip = getClientAddr(event);
    request.headers.set("x-forwarded-for", ip);
    const r = await api(request);
    if (r !== undefined) {
      if (r instanceof Response) return r;
      const eh = encryptHeader(request);
      if (eh) {
        const [kNum] = getKINums(eh);
        return encryptResp(r, kNum);
      }
      return resp(r);
    }
    return resp("");
  }
  return resp("", 405);
};

const dBProxyErrs = new WeakMap<Model, Writable<Error | number>>();
export const throwDbProxyError = <T extends Model>(o: T): Promise<T> => {
  const err = dBProxyErrs.get(o);
  let un: Unsubscriber | undefined;
  let t: Timer;
  if (err) {
    t = setTimeout(() => {
      err.set(0);
    }, 300);
  }
  return new Promise<T>((r, fail) => {
    if (!err) {
      r(o);
    } else {
      err.set(-1);
      un = err.subscribe((n) => {
        if (n) {
          if (n instanceof Error) fail(n);
        } else r(o);
      });
    }
  }).finally(() => {
    clearTimeout(t);
    if (un) un();
  });
};
export const DBProxy = <T extends Model>(C: Class<T>, init: Obj<T> = {}, load = true): T => {
  const error: Writable<Error | number> = writable(0);
  type key = keyof T;
  type value = T[key];
  const pk = getPrimaryKey(C.name) as keyof T;
  let o = model(C, init);
  let ori = {} as Obj<T>;
  let changes = {} as T;
  let create = false;
  const saveSync = () => {
    const p = diffObj(ori, { ...o, ...changes });
    if (!p) return;
    if (pk) p[pk] = o[pk];
    const ch = model(C, p);
    try {
      db.save(ch, { create });
      error.set(0);
    } catch (e) {
      console.error(e);
      error.set(e as Error);
      changes = {} as T;
      return;
    }
    create = false;
    ori = { ...Object.assign(o, changes, ch) };
    changes = {} as T;
  };
  const save = delay(saveSync, 100);
  if (load) {
    const k = o[pk];
    let u = 0;
    if (k) {
      const e = db.get(model(C, { [pk]: k }));
      if (e) {
        ori = { ...e };
        o = Object.assign(e, o);
        u = 1;
      } else create = true;
    }
    if (!u) {
      const r = db.get(o);
      if (r) {
        ori = { ...r };
        o = Object.assign(r, o);
      }
    }
    saveSync();
  }
  const px = new Proxy(o, {
    get(target, p: string, receiver: T) {
      const v = Reflect.get(target, p, receiver);
      return hasOwnProperty(target, p) ? val(v) : v;
    },
    set(target, p: string, newValue: value): boolean {
      changes[p as keyof T] = newValue;
      save();
      return true;
    }
  }) as T;
  dBProxyErrs.set(px, error);
  return px;
};

export const combineResult = (id: number, pk: ArrayBuffer) => {
  const bf = new Uint8Array(pk);
  const nbf = new Uint8Array(pk.byteLength + 2);
  nbf[0] = id >> 8;
  nbf[1] = id & 0xff;
  nbf.set(bf, 2);
  return nbf.buffer;
};

const countMap = new Map<string, number>();

export const model = <T extends Model>(M: Class<T> | FunctionConstructor, o: object = {}) => {
  const a = new M() as Obj<T>;
  const ks = new Set<keyof T>([...(Object.keys(o).filter((n) => n in a) as (keyof T)[])]);

  Object.keys(a).forEach((k) => {
    const o = k as keyof T;
    if (typeof a[o] !== "function") delete a[o];
  });
  return Object.assign(a, filter(o, [...ks]));
};

export const md5 = (buf: Buffer | string) => {
  const hashSum = crypto.createHash("md5");
  hashSum.update(buf);
  return hashSum.digest("hex");
};

export const mkdir = (dir: string) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return "";
  } catch (e) {
    console.error(e);
    if (e instanceof Error) return getErr(e);
  }
};

export const saveFile = (name: string | number, dir: string, buf: Buffer) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const p = path.resolve(dir, name + "");
  fs.writeFileSync(p, buf, { flag: "w" });
};

const _delFile = (id: string | number, dir: string) => {
  if (fs.existsSync(dir)) {
    try {
      fs.unlinkSync(path.resolve(dir, id + ""));
      return true;
    } catch (e) {
      console.log(e);
    }
  }
};
export const delFile = (id: string | number) => {
  if (_delFile(id, sys.uploadDir)) {
    _delFile(id, sys.thumbDir);
  }
};

const cacheCount = (model: Class<Model>, where?: [string, ...unknown[]]) => {
  const k = `${model.name}-${where?.join() || ""}`;
  const c = countMap.get(k);
  if (c !== null && c !== undefined) return c;
  else {
    const c = db.count(model, where);
    countMap.set(k, c);
    setTimeout(() => countMap.delete(k), 6e4); // cache 1min
    return c;
  }
};

export const pageBuilder = <T extends Model>(
  page: number,
  size: number,
  model: Class<T>,
  orders: string[] = [],
  keys: (keyof T)[] = [],
  where?: [string, ...unknown[]],
  after?: (a: T[]) => T[]
) => {
  const c = cacheCount(model, where) as number;
  return {
    total: Math.floor((c + size - 1) / size),
    items: arrFilter(db.page(model, page, size, orders, where, after), keys, false)
  };
};

export const hasKey = <T extends Model>(o: Obj<T>, key: string) => {
  const C = o.constructor as Class<T>;
  return Object.hasOwn(new C() as object, key);
};
export const setKey = <T extends Model>(o: Obj<T>, key: string, value: unknown) => {
  if (hasKey(o, key)) o[key as keyof T] = value as T[keyof T];
};

export let sysStatue = 0;
const chk = () => {
  // step1 config db
  const dbc = ".dbCfg";
  let dbOk = false;
  if (fs.existsSync(dbc)) {
    const p = fs.readFileSync(dbc).toString();
    if (!p) return 0;
    const err = mkdir(path.dirname(p));
    if (err) {
      console.log(err);
      return 0;
    }
    const er = server.start(p);
    if (er) {
      return 0;
    } else dbOk = true;
  }
  if (!dbOk) return 0;
  // step2 set admin:
  if (!sys?.admUsr || !sys?.admPwd) return 1;
  // step3 set upload
  if (!sys?.uploadDir || !sys?.thumbDir) return 2;
  // step4 set geo ip
  if (sys?.ipLiteToken === null) return 3;
  return 9;
};
export const checkStatue = () => {
  sysStatue = chk();
  return sysStatue;
};

export const getClientAddr = (event: RequestEvent) => {
  const req = event.request;
  let addr = getIp(req).split(/ +/)[0];
  if (!addr) {
    try {
      addr = event.getClientAddress();
    } catch (e) {
      console.error(e);
    }
  }
  return addr || "";
};

export const getCookie = (req: Request, key: string) => {
  const c = req.headers.get("cookie");
  if (c) {
    const ck = cookie.parse(c);
    return ck[key];
  }
};
const ckCfg = {
  httpOnly: true,
  sameSite: "strict",
  path: "/"
} as CookieSerializeOptions;

export const delCookie = (resp: Response, key: string) => {
  resp.headers.append(
    "set-cookie",
    cookie.serialize(key, "", {
      ...ckCfg,
      expires: new Date(0)
    })
  );
};

export const setCookie = (resp: Response, key: string, value: string, expires?: number) => {
  if (value === undefined) throw new Error("undefined cookie value!");
  const cf = { ...ckCfg };
  if (expires) cf.expires = new Date(expires);
  resp.headers.append("set-cookie", cookie.serialize(key, value, cf));
};

export const getClient = (req: Request) => {
  const c = getCookie(req, "token");
  let cli;
  if (c) {
    cli = clientMap.get(c);
  }
  if (debugMode)
    if (!cli) {
      cli = new Client(true);
    }
  return cli;
};

export const expDay = (n: number) => Date.now() + n * 86400000;
export const setToken = (req: Request, resp: Response, token: TokenInfo) => {
  const client = getClient(req) || new Client();
  client.addToken(token);
  setCookie(resp, "token", client.uuid, expDay(360));
};

export function checkRedirect(statue: number, path: string, req: Request) {
  let needLogin = false;
  const done = statue === 9;
  const login = "/login";
  const config = "/config";
  const isCfg = path === config;
  if (statue > 1 && !done) {
    const client = getClient(req);
    needLogin = !client?.ok(permission.Read);
  }
  if (needLogin && !debugMode) {
    if (isCfg || /^\/(admin)/i.test(path)) return login;
    return "";
  }
  if (!done && !isCfg) {
    return config;
  } else if (done && isCfg) {
    return "/";
  }
  return "";
}

export const debugMode = 0;
export const sqlFields = (n: number) => ",?".repeat(n).slice(1);

export const mv = (from: string, to: string) => {
  let mv = 0;
  let err;
  if (from) {
    err = mkdir(from);
    mv++;
  }
  if (!err) {
    if (to) err = mkdir(to);
    mv++;
  }
  if (!err && mv === 2) {
    try {
      fse.moveSync(from, to, { overwrite: true });
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        err = getErr(e);
      }
    }
  }
  return err;
};

export const blogExp = () => {
  const dbc = ".dbCfg";
  const dbpath = fs.readFileSync(dbc).toString();
  const zip = new JSZip();
  const z = (s: string) => {
    if (!s) return;
    const f = zip.folder(s);
    fs.readdirSync(s).forEach((a) => {
      f?.file(a, fs.readFileSync(path.resolve(s, a)));
    });
  };
  zip.file(dbc, dbpath);
  const name = dbpath.split(/[\\/]/).pop();
  if (!name) return;
  const dir = dbpath.slice(0, dbpath.length - name.length);
  const f = db.db.serialize();
  if (dir) zip.folder(dbpath)?.file(name, f);
  else zip.file(dbpath, f);
  z(sys.uploadDir);
  z(sys.thumbDir);
  return zip.generateAsync({ type: "uint8array" });
};

export const printSql = (sql: string, value: unknown[]) => {
  let i = 0;
  return is_dev ? sql.replace(/\?/g, () => `${value[i++]}`) : "";
};

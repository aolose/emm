import {NULL} from './enum';
import {contentType, dataType, encryptIv, encTypeIndex, geTypeIndex} from '../enum';
import type {ApiData, ApiName, Class, DiffFn, Obj, PatchFn} from '../types';
import apis from './api';
import {
    encrypt,
    parseBody,
    randNum,
    decryptReq,
    encryptHeader,
    getKINums,
    data2Buf,
    hasOwnProperty, arrFilter, filter, delay, diffObj
} from '../utils';
import {keyPool} from './crypto';
import type {Api} from '../types';
import type {Model} from '../types';
import {getPrimaryKey} from './model/decorations';
import {db, server, sys} from './index';
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {Res} from "$lib/server/model";

export const is_dev = process.env.NODE_ENV !== 'production';

export const sqlVal = (values: unknown[]) =>
    values.map((a) => {
        const t = typeof a;
        switch (t) {
            case 'boolean':
                return +(a as boolean);
            case 'object':
                if (a instanceof Date) return a.getTime();
        }
        return a;
    });

export function noNullKeyValues<T extends Model>(o: Obj<T>) {
    const C = o.constructor as Class<T>
    const ks = Object.keys(new C()) as (keyof T)[]
    // for safe
    filter(o, ks)
    const keys = [] as string[];
    const values = [] as unknown[];
    const {TEXT, INT, DATE} = NULL;
    Object.entries(o).forEach(([k, v]) => {
        if (k[0] === '_') return;
        if (v !== undefined && v !== null) {
            const t = v.constructor.name;
            switch (t) {
                case 'Boolean':
                    break;
                case 'String':
                    if (v === TEXT) return;
                    break;
                case 'Number':
                    if (v === INT) return;
                    break;
                case 'Date':
                    if ((v as Date).getTime() === DATE.getTime()) return;
                    break;
                default:
                    return;
            }
        }
        if (v === undefined) v = null
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
        if (is_dev) console.log(now(), label, ...params);
    },
    info(label: string, ...params: unknown[]) {
        console.log(now(), label, ...params);
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
        case 'String':
            if (a === NULL.TEXT) return null;
            break;
        case 'Number':
            if (a === NULL.INT) return null;
            break;
        case 'Date':
            if (a === NULL.DATE) return null;
            break;
    }
    return a;
};

export const resp = (body: ApiData, code = 200) => {
    const [tp, data] = parseBody(body);
    return new Response(data as BodyInit, {
        status: code,
        headers: new Headers({
            [contentType]: tp
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

export const uniqSlug = (id: number, slug: string) => {
    const params = [`slug%`] as unknown[]
    let sql = `select slug from post where slug like ?`
    if (id) {
        sql = `${sql} and id != ?`
        params.push(id)
    }
    const slugs = db.db.prepare(sql).all(...params).map(a => a.slug)
    if (slugs.length) {
        const n = slugs.map(a => +a.replace(slug, '')).filter(a => a).reduce((a, b) => a > b ? a : b)
        return `${slug}-${n}`
    }
}

export const setNull = <T extends object>(o: T, key: string) => {
    (o as { [key: string]: unknown })[key] = null
}

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
    return resp('', 403);
};

export const apiHandle = async (request: Request, name: ApiName): Promise<Response> => {
    const m = request.method.toLowerCase() as keyof Api;
    const api = apis[name]?.[m];
    if (api) {
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
        return resp('');
    }
    return resp('', 404);
};


export const DBProxy = <T extends Model>(C: Class<T>, init: Obj<T> = {}, load = true): T => {
    type key = keyof T
    type value = T[key]
    const pk = getPrimaryKey(C.name) as keyof T
    let o = model(C, init)
    let ori = {} as Obj<T>
    const save = delay(() => {
        const p = diffObj(ori, o)
        if (!p) return
        if (pk) p[pk] = o[pk]
        const ch = model(C, p)
        db.save(ch)
        ori = {...Object.assign(o, ch)}
    }, 100)
    if (load) {
        const k = o[pk]
        let u = 0
        if (k) {
            const e = db.get(model(C, {[pk]: k}))
            if (e) {
                ori = {...e}
                o = Object.assign(e, o)
                u = 1
            }
        }
        if (!u) {
            const r = db.get(o)
            if (r) {
                ori = {...r}
                o = Object.assign(r, o)
            }
        }
        save()
    }
    return new Proxy(o, {
        get(target: T, p: string, receiver: T) {
            const v = Reflect.get(target, p, receiver);
            return hasOwnProperty(target, p) ? val(v) : v;
        },
        set(target: T, p: string, newValue: value, receiver: T): boolean {
            save()
            return Reflect.set(target, p, newValue, receiver);
        }
    }) as T;
};

export const combineResult = (id: number, pk: ArrayBuffer) => {
    const bf = new Uint8Array(pk);
    const nbf = new Uint8Array(pk.byteLength + 2);
    nbf[0] = id >> 8;
    nbf[1] = id & 0xff;
    nbf.set(bf, 2);
    return nbf.buffer;
};

export const countMap = new Map<string, number>()

export const cacheCount = (o: Class<Model>, num?: number) => {
    const nm = o.name
    if (num !== undefined) {
        countMap.set(nm, num)
        return
    }
    let n = countMap.get(nm)
    if (n === undefined) {
        n = db.count(o)
        countMap.set(nm, n)
        setTimeout(() => countMap.delete(nm), 1e4)
    }
    return n;
}

export const model = <T extends Model>(M: Class<T> | FunctionConstructor, o: object = {}) => {
    const a = new M() as Obj<T>
    Object.keys(a).forEach((k) => {
        const o = k as keyof T
        if (typeof a[o] !== 'function') delete a[o]
    })
    return filter(Object.assign(a, o), Object.keys(o) as (keyof T)[])
}

export const md5 = (buf: Buffer | string) => {
    const hashSum = crypto.createHash('md5');
    hashSum.update(buf);
    return hashSum.digest('hex');
}

export const mkdir = (dir: string) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true})
        }
        return  ''
    } catch (e) {
        return e?.toString() || 'error'
    }
}

export const saveFile = (name: string | number, dir: string, buf: Buffer) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true})
    }
    const p = path.resolve(dir, name + '')
    fs.writeFileSync(p, buf, {flag: 'w'});
}

export const pageBuilder = async <T extends Model>(
    req: Request,
    model: Class<T>,
    orders: string[],
    keys: (keyof T)[] = []
) => {
    const r = new Uint8Array(await req.arrayBuffer())
    const p = r[0]
    const s = r[1]
    const c = cacheCount(Res) as number
    return {
        total: Math.floor((c + s - 1) / s),
        items: arrFilter(db.page(model, p, s, orders), keys, false)
    }
}

export const hasKey = <T extends Model>(o: Obj<T>, key: string) => {
    const C = o.constructor as Class<T>
    return Object.hasOwn(new C(), key)
}
export const setKey = <T extends Model>(o: Obj<T>, key: string, value: unknown) => {
    if (hasKey(o, key)) o[key as keyof T] = value as T[keyof T]
}

export const patchTags: PatchFn<Set<string>> = (data, add, del) => {
    const d = new Set(data)
    if (del) for (const s of del) d.delete(s)
    if (add) for (const s of add) d.add(s)
    return d
}
export const diffTags: DiffFn<Set<string>> = (old, cur) => {
    const add = new Set<string>()
    const del = new Set<string>()
    for (const o of cur) if (!old.has(o)) add.add(o)
    for (const o of old) if (!cur.has(o)) del.add(o)
    return {add, del}
}

export let sysStatue = 0
const chk = () => {
    // step1 config db
    const dbc = '.config.db'
    let dbOk = false
    if (fs.existsSync(dbc)) {
        const p = fs.readFileSync(dbc).toString()
        if (!p) return 0
        if (!fs.existsSync(p)) {
            try {
                fs.mkdirSync(path.dirname(p), {recursive: true})
            } catch (e) {
                console.log(e)
            }
        }
        const er = server.start(p)
        if (er) {
            return 0
        } else dbOk = true
    }
    if (!dbOk) return 0
    // step2 set admin:
    if (!sys.admUsr || !sys.admPwd) return 1
    // step3 set upload
    if (!sys.uploadDir || !sys.thumbDir) return 2
    // step4 set geo ip
    if (sys.ipLiteToken === null) return 3
    return 9
}
export const checkStatue = () => {
    sysStatue = chk()
    return sysStatue
}

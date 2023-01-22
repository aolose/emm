import {NULL, permission, token_statue} from './enum';
import {contentType, dataType, encryptIv, encTypeIndex, geTypeIndex} from '../enum';
import cookie from 'cookie'
import type {CookieSerializeOptions} from 'cookie'
import type {Api, ApiData, ApiName, Class, Model, Obj} from '../types';
import apis from './api';
import {
    arrFilter,
    data2Buf,
    decryptReq,
    delay,
    diffObj,
    encrypt,
    encryptHeader,
    filter,
    getKINums,
    hasOwnProperty,
    parseBody,
    randNum
} from '../utils';
import {keyPool} from './crypto';
import {getPrimaryKey} from './model/decorations';
import {db, server, sys} from './index';
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {Res} from "$lib/server/model";
import type {RequestEvent} from "@sveltejs/kit";
import {getPermissions} from "$lib/server/token";

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

export function noNullKeyValues(o:Obj<Model>) {
    const C = o.constructor as Class<Model>
    const ks = new Set<string>(Object.keys(new C() as object) as (keyof Model)[])
    const keys = [] as string[];
    const values = [] as unknown[];
    const {TEXT, INT, DATE} = NULL;
    Object.entries(o).forEach(([k, v]) => {
        if (k[0] === '_'&&!ks.has(k[0])) return;
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

export const apiHandle = async (event: RequestEvent): Promise<Response> => {
    const {request, params} = event
    const name = params.api as ApiName;
    const m = request.method.toLowerCase() as keyof Api;
    const api = apis[name]?.[m];
    if (api) {
        const ip = getClientAddr(event)
        request.headers.set('x-forwarded-for', ip)
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
    return resp('', 405);
};


export const DBProxy = <T extends Model>(C: Class<T>, init: Obj<T> = {}, load = true): T => {
    type key = keyof T
    type value = T[key]
    const pk = getPrimaryKey(C.name) as keyof T
    let o = model(C, init)
    let ori = {} as Obj<T>
    let create = false
    const save = delay(() => {
        const p = diffObj(ori, o)
        if (!p) return
        if (pk) p[pk] = o[pk]
        const ch = model(C, p)
        db.save(ch, create)
        create=false
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
            } else create = true
        }
        if (!u) {
            const r = db.get(o)
            if (r) {
                ori = {...r}
                o = Object.assign(r, o)
            }
        }
        save(create)
    }
    return new Proxy(o, {
        get(target, p: string, receiver: T) {
            const v = Reflect.get(target, p, receiver);
            return hasOwnProperty(target, p) ? val(v) : v;
        },
        set(target, p: string, newValue: value, receiver: T): boolean {
            save(create)
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
        return ''
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
    keys: (keyof T)[] = [],
    where?: [string, ...unknown[]]
) => {
    const r = new Uint8Array(await req.arrayBuffer())
    const p = r[0]
    const s = r[1]
    const c = cacheCount(Res) as number
    return {
        total: Math.floor((c + s - 1) / s),
        items: arrFilter(db.page(model, p, s, orders, where), keys, false)
    }
}

export const hasKey = <T extends Model>(o: Obj<T>, key: string) => {
    const C = o.constructor as Class<T>
    return Object.hasOwn(new C() as object, key)
}
export const setKey = <T extends Model>(o: Obj<T>, key: string, value: unknown) => {
    if (hasKey(o, key)) o[key as keyof T] = value as T[keyof T]
}

export let sysStatue = 0
const chk = () => {
    // step1 config db
    const dbc = '.dbCfg'
    let dbOk = false
    if (fs.existsSync(dbc)) {
        const p = fs.readFileSync(dbc).toString()
        if (!p) return 0
        const err = mkdir(path.dirname(p))
        if (err) {
            console.log(err)
            return 0
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
    console.log(sysStatue)
    return sysStatue
}

export const getClientAddr = (event: RequestEvent) => {
    const hdr = event.request.headers
    let addr = (hdr.get('x-forwarded-for') || hdr.get('x-real-ip') || '').split(/ +/)[0]
    if (!addr) {
        try {
            addr = event.getClientAddress()
        } catch (e) {
            console.log(e?.toString())
        }
    }
    return addr || ''
}


const getCookie = (req: Request, key: string) => {
    const c = req.headers.get('cookie')
    if (c) {
        const ck = cookie.parse(c)
        return ck[key]
    }
}
const ckCfg = {
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
} as CookieSerializeOptions

const delCookie = (resp: Response, key: string) => {
    resp.headers.append('set-cookie', cookie.serialize(key, '', {
        ...ckCfg,
        expires: new Date(0)
    }))
}

const setCookie = (resp: Response, key: string, value: string) => {
    const c = cookie.serialize(key, value, ckCfg)
    resp.headers.append('set-cookie', c)
}

export const getTokens = (req: Request) => {
    return (getCookie(req, 'token') || '').split(',')
}

export const setTokens = (resp: Response, tokens: string[]) => {
    setCookie(resp, 'token', tokens.join(','))
}

export function checkRedirect(statue: number, path: string, req: Request) {
    let needLogin = false
    const done = statue === 9
    const login = '/login'
    const config = '/config';
    if (statue > 1) {
        const tks = getTokens(req)
        const pms = getPermissions(tks)
        needLogin = pms.get(permission.Admin) !== token_statue.ok
    }
    if (needLogin && !skipLogin) {
        if (path !== login) return login
        return ''
    }
    if (!done) {
        if (!done && !path.startsWith(config)) {
            return config
        }
    } else if (done && path === config) {
        return '/'
    }
    return ''
}


export const skipLogin = true
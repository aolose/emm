import {
    decryptBuf,
    fetchOpt,
    shareKey,
    encryptHeader,
    getHeaderDataType,
    syncShareKey, randNum
} from './utils';
import {dataType, reqMethod} from './enum';
import {browser} from '$app/environment';
import type {ApiName, cacheRecord, reqData, reqParams, reqCache, MethodNumber, reqOption} from './types';
import type {Load} from "@sveltejs/kit";

const cacheData = '.d';
const cacheKey = '.k';
const cacheExpire = '.e';
const cacheBegin = '.b';


let reqCacheMap: reqCache;
const cacheNames = [cacheData, cacheKey, cacheExpire, cacheBegin];
const reqPromiseCache = new Map<string, Promise<reqData>>();
const reqKey = (url: string, params: reqParams, method?: MethodNumber, key?: string | number) => {
    let rk = `${url}${method || 0}`;
    if (key) return `${rk}${key}`
    if (params !== undefined) {
        const k = JSON.stringify(params).replace(/[^{}()-_'"\\/?: ]/gi, '')
        rk = `${url}_${k.length}_${Array.from(k).reduce((a, b) => a + b.charCodeAt(0), 0)}`
    }
    return rk;
};

const saveCacheToStorage = () => {
    if (!browser) return;
    const d = [] as unknown[];
    const k = [] as string[];
    const e = [] as number[];
    const now = Date.now();

    localStorage.setItem(cacheBegin, now + '');
    for (const [a, [n, b, p]] of reqCacheMap) {
        const dur = n - now;
        if (!p && dur > 0) {
            k.push(a);
            d.push(b);
            e.push(dur);
        }
    }
    localStorage.setItem(cacheData, JSON.stringify(d));
    localStorage.setItem(cacheKey, k.join());
    localStorage.setItem(cacheBegin, e.join());
    localStorage.setItem(cacheBegin, now + '');
};

const loadCacheFromStorage = () => {
    if (!browser) return;
    if (!reqCacheMap) reqCacheMap = new Map();
    let ch;
    const [d, k, e, b] = cacheNames.map((a) => localStorage.getItem(a));
    if (d && k && e && b) {
        try {
            const da = JSON.parse(d);
            const ke = k.split(',');
            const ex = e.split(',').map((a) => +a);
            const bg = +b;
            const n = Date.now();
            ex.forEach((a: number, i: number) => {
                const exp = a + bg;
                if (exp > n) {
                    reqCacheMap.set(ke[i], [exp, da[i], undefined]);
                } else ch = 1;
            });
        } catch (e) {
            // ignore
        }
    }
    if (ch) saveCacheToStorage();
};
loadCacheFromStorage();

let notFirst = false;
let isLoadFn = false;
const allowReadCache = () => {
    const r = !isLoadFn || notFirst;
    notFirst = true;
    return r;
};
const reqCache = (
    key: string,
    run: (re?: cacheRecord) => Promise<reqData>
): Promise<reqData> => {
    if (!key) {
        return run();
    }
    if (!browser) {
        return run();
    }
    const rec = key && reqCacheMap.get(key);
    const now = Date.now();
    if (allowReadCache() && rec) {
        const [n, d, p] = rec;
        if (p) return p;
        if (n > now) {
            return Promise.resolve(d);
        }
    }
    const r = [-1, undefined, undefined] as cacheRecord;
    reqCacheMap.set(key, r);
    r[2] = run(r);
    return r[2];
};

const query = async (url: ApiName, params?: reqParams, cfg?: reqOption): Promise<reqData> => {
    let uu = url as string;
    if (cfg?.before) {
        const [b, u] = cfg.before(params, url);
        if (b) params = b;
        if (u) uu = u;
    }
    const enc = browser && cfg?.encrypt;
    if (enc) await syncShareKey();
    const opt = {
        method: reqMethod[cfg?.method || 0],
        ...(await fetchOpt(params, enc))
    };
    isLoadFn = !!cfg?.fetch;
    const ft = cfg?.fetch || fetch;
    const fullUrl = `/api/${uu}`;
    return ft(fullUrl, opt).then(async (r) => {
        let fal = false
        if (r.status >= 400) {
            fal = true
            cfg = cfg || {};
            cfg.cache = 0;
        }
        const e = encryptHeader(r);
        const t = getHeaderDataType(r.headers);
        let ru
        if (e) {
            const b = await r.arrayBuffer();
            const d = await decryptBuf(b, parseInt(e, 36), shareKey);
            switch (t) {
                case dataType.json:
                    ru = d.json();
                    break;
                case dataType.text:
                    ru = d.text();
                    break
                default:
                    ru = d.buffer();
            }
        } else {
            switch (t) {
                case dataType.json:
                    ru = r.json();
                    break;
                case dataType.text:
                    ru = r.text();
                    break
                default:
                    ru = r.arrayBuffer();
            }
        }
        if (fal) {
            throw {
                status: r.status,
                data: await ru
            }
        }
        return ru
    });
};

export const saveCache = (
    url: ApiName,
    params: reqParams | reqData,
    data: reqData | number,
    cache?: number,
    method?: MethodNumber
) => {
    let p: reqParams;
    let d: reqData;
    let c: number;
    if (cache === undefined && typeof data === 'number') {
        d = params;
        c = data;
    } else {
        p = params as reqParams;
        d = data;
        c = cache as number;
    }
    const key = reqKey(url, p, method);
    const now = Date.now();
    const r = [now + c, d, undefined] as cacheRecord;
    reqCacheMap.set(key, r);
    saveCacheToStorage();
};

const delayPms = new Map<string, Promise<reqData>>()
const delayMap = new Map<string, [number, reqParams?]>()

export const req = (url: ApiName, params?: reqParams, cfg?: reqOption) => {
    const done = cfg?.done
    const delay = cfg?.delay
    if (browser && delay) {
        const delayKey = reqKey(url, params, cfg?.method, cfg?.delayKey || cfg?.delay)
        delayMap.set(delayKey, [Date.now() + delay, params])
        let p = delayPms.get(delayKey)
        if (!p) {
            p = new Promise<reqData>((resolve) => {
                const run = () => requestAnimationFrame(() => {
                    const dt = delayMap.get(delayKey)
                    if (dt) {
                        if (Date.now() > dt[0]) {
                            const c = {...(cfg || {})}
                            delete c.delay
                            req(url, dt[1], c).then(r => resolve(r))
                        } else {
                            run()
                            return
                        }
                    }
                })
                run()
            }).finally(() => {
                delayMap.delete(delayKey)
                delayPms.delete(delayKey)
            })
            delayPms.set(delayKey, p)
        }
        return p
    }
    const key = reqKey(url, params, cfg?.method);
    let p = browser ? reqPromiseCache.get(key) : undefined;
    if (!p) {
        const cache = cfg?.cache
        p = reqCache(cache ? key : '', async (rec) => {
            const d = await query(url, params, cfg);
            if (cache && rec) {
                rec[0] = Date.now() + cache;
                rec[1] = d;
                rec[2] = undefined;
                saveCacheToStorage();
            }
            return d;
        }).then(d => {
            if (done) done(d)
            return d
        }).catch(e => {
            if (cfg?.fail) {
                cfg.fail(e.data, e.status)
            } else throw e
        }).finally(() => reqPromiseCache.delete(key))
        if (browser) {
            reqPromiseCache.set(key, p);
        }
    }
    return p;
};
export const api = (url: ApiName, cfg?: reqOption) => {
    const c = {...(cfg || {})}
    if (c.delay) c.delayKey = randNum().toString(36)
    return (params?: reqParams) => {
        return req(url, params, c)
    }
}
export const useApi = (url: ApiName, params?: reqParams, cfg?: reqOption): Load =>
    async function ({fetch}) {
        (cfg = cfg || {}).fetch = fetch;
        return await req(url, params, cfg);
    };

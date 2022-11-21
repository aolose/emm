import {
    decryptBuf,
    fetchOpt,
    shareKey,
    encryptHeader,
    getHeaderDataType,
    syncShareKey
} from './utils';
import {dataType, reqMethod} from './enum';
import {browser} from '$app/environment';
import type {ApiName, cacheRecord, reqData, reqParams, reqCache} from './types';
import type {PageLoad} from '../../.svelte-kit/types/src/routes/$types';

const cacheData = '.d';
const cacheKey = '.k';
const cacheExpire = '.e';
const cacheBegin = '.b';
type reqOption = {
    cache?: number;
    delay?: number;
    fetch?: typeof fetch;
    method?: 0 | 1 | 2 | 3;
    encrypt?: boolean;
    before?(data: unknown, url?: string): [unknown, string | undefined, Headers?];
};

let reqCacheMap: reqCache;
const cacheNames = [cacheData, cacheKey, cacheExpire, cacheBegin];
type RecordPms = [Promise<reqData>, number]
const reqPromiseCache = new Map<string, RecordPms>();
const reqKey = (url: string, params: reqParams) => {
    let key = url;
    if (params !== undefined)
        key =
            url +
            '_' +
            Array.from(JSON.stringify(params).replace(/[^{}()-_'"\\/?: ]/gi, '')).reduce(
                (a, b) => a + b.charCodeAt(0),
                0
            );
    return key;
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
    url: string,
    params: reqParams,
    cache: number | undefined,
    run: (re?: cacheRecord) => Promise<reqData>
): Promise<reqData> => {
    const key = reqKey(url, params);
    if (!cache) {
        return run();
    }
    if (!browser) {
        return run();
    }
    const rec = reqCacheMap.get(key);
    const now = Date.now();
    if (allowReadCache() && rec) {
        const [n, d, p] = rec;
        if (p) return p;
        if (n > now) return Promise.resolve(d);
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
        if (r.status >= 400) {
            cfg = cfg || {};
            cfg.cache = 0;
        }
        const e = encryptHeader(r);
        const t = getHeaderDataType(r.headers);
        if (e) {
            const b = await r.arrayBuffer();
            const d = await decryptBuf(b, parseInt(e, 36), shareKey);
            switch (t) {
                case dataType.json:
                    return d.json();
                case dataType.text:
                    return d.text();
            }
            return d.buffer();
        } else {
            switch (t) {
                case dataType.json:
                    return r.json();
                case dataType.text:
                    return r.text();
            }
            return r.arrayBuffer();
        }
    });
};

export const saveCache = (
    url: ApiName,
    params: reqParams | reqData,
    data: reqData | number,
    cache?: number
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
    const key = reqKey(url, p);
    const now = Date.now();
    const r = [now + c, d, undefined] as cacheRecord;
    reqCacheMap.set(key, r);
    saveCacheToStorage();
};

export const req = (url: ApiName, params?: reqParams, cfg?: reqOption) => {
    const key = reqKey(url, params);
    let p = browser ? reqPromiseCache.get(key) : undefined;
    if (!p) {
        p = [reqCache(url, params, cfg?.cache, async (rec) => {
            const delay = cfg?.delay
            await new Promise(resolve => {
                const done = () => {
                    if (p) {
                        if (p[1]) {
                            p[1] = 0
                            setTimeout(done, delay)
                            return
                        }
                    }
                    resolve(0)
                }
                setTimeout(done, delay)
            })
            const d = await query(url, params, cfg)
            if (cfg?.cache && rec) {
                rec[0] = Date.now() + cfg.cache;
                rec[1] = d;
                rec[2] = undefined;
                saveCacheToStorage();
            }
            reqPromiseCache.delete(key);
            return d;
        }), 0]
        if (browser) reqPromiseCache.set(key, p);
    } else {
        p[1] = 1
    }
    return p[0];
};

export const useApi = (url: ApiName, params?: reqParams, cfg?: reqOption): PageLoad =>
    async function ({fetch}) {
        (cfg = cfg || {}).fetch = fetch;
        return await req(url, params, cfg);
    };

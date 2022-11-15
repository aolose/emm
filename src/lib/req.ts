import {parseBuf, toBodyBuf} from "./utils";
import {dataType, reqMethod} from "./enum";
import {browser} from "$app/environment";
import type {ApiName} from "./server/types";
import {getHeaderDataType} from "./utils";

const localCacheKey = '__cache'

type reqOption = {
    cache?: 0,
    method?: 0 | 1 | 2 | 3,
    encrypt?: boolean,
    type?: dataType,//object,string,number
    before?(data: unknown, url?: string, header?: Headers): [unknown, string | undefined, Headers?],
}
type reqData = object | string | number | boolean | null | void
type reqParams = object | string | number | undefined
type cacheRecord = [number, reqData, Promise<reqData> | undefined]
type reqCacheMap = Map<string, cacheRecord>
let reqCacheMap: reqCacheMap

function reqKey(url: string, params: reqParams) {
    let key = url
    if (params !== undefined) key = url + '_' + Array.from(JSON.stringify(params)
        .replace(/[{}:,']/g, ''))
        .reduce((a, b) => a + b.charCodeAt(0), 0)
    return key
}

export function loadCacheFromStorage() {
    reqCacheMap = new Map()
    if (!browser) return
    let ch
    const rec = localStorage.getItem(localCacheKey)
    if (rec) {
        const now = Date.now()
        try {
            const r = JSON.parse(rec)
            Object.keys(r).forEach((a,) => {
                const b = r[a]
                const [n] = b as cacheRecord
                if (n > now) reqCacheMap.set(a, b)
                else ch = 1
            })
        } catch (e) {
            localStorage.getItem('')
        }
    }
    if (ch) saveCacheToStorage()
}

function saveCacheToStorage() {
    if (!browser) return
    const o = {} as { [keu: string]: reqData }
    const now = Date.now()
    for (const [k, [n, d, p]] of reqCacheMap) {
        if (!p && n > now) o[k] = d
    }
    localStorage.setItem(localCacheKey, JSON.stringify(o))
}


async function reqCache(url: string, params: reqParams, cache: number | undefined, run: (re?: cacheRecord) => Promise<reqData>) {
    if (!cache || !browser) return await run()
    if (reqCacheMap) loadCacheFromStorage()
    const key = reqKey(url, params)
    const rec = reqCacheMap.get(key)
    const now = Date.now()
    if (rec) {
        const [n, d, p] = rec;
        if (p) return p
        if (n > now) return d
    } else {
        const r = [-1, undefined, undefined] as cacheRecord
        r[2] = run(r)
        reqCacheMap.set(key, r)
        saveCacheToStorage()
        return r[2]
    }
}

function errorHandle() {
    // todo
}

export async function req(url: ApiName, params?: reqParams, cfg?: reqOption) {
    let headers = new Headers()
    const ct = 'Content-Type'
    let tp = 'application/octet-stream'
    switch (cfg?.type) {
        case dataType.json:
            tp = 'application/json'
            break
        case dataType.text:
            tp = 'text/pain'
            break
    }
    headers.set(ct, tp)

    let uu = url as string
    if (cfg?.before) {
        const [b, u, h] = cfg.before(params, url, headers)
        if (b) params = b
        if (u) uu = u
        if (h) headers = h
    }
    const fullUrl = `/api/${uu}`
    const opt = {
        headers,
        method: reqMethod[cfg?.method || 0],
        body: await toBodyBuf(params, cfg?.encrypt) as BodyInit
    }
    return reqCache(url, params, cfg?.cache, async (rec?: cacheRecord) => {
        const p = new Promise<reqData>((resolve, reject) => {
            fetch(fullUrl, opt).then(async r => {
                if (r.status > 299) {
                    cfg = cfg || {}
                    cfg.cache = 0
                    cfg.type = dataType.text
                }

                const b = await r.arrayBuffer()
                const d = await parseBuf(await b, r.headers.has('encrypt'))
                const t = getHeaderDataType(r.headers)
                switch (t) {
                    case dataType.json:
                        return d.json()
                    case dataType.text:
                        return d.string()
                }
                return d.buffer()
            }).then(d => {
                if (cfg?.cache && rec) {
                    rec[0] = Date.now() + cfg.cache
                    rec[1] = d
                    rec[2] = undefined
                }
                resolve(d)
            }).catch(reject)
        })
        if (rec) rec[2] = p
        return p
    })
}
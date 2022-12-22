import type {RequestEvent} from "@sveltejs/kit";
import ipRangeCheck from 'ip-range-check'
import {db} from "$lib/server/index";
import {FwLog, FWRule} from "$lib/server/model";
import {filter, hds2Str} from "$lib/utils";
import type {Obj, Timer} from "$lib/types";
import {getClientAddr, model} from "$lib/server/utils";
import {ipInfo} from "$lib/server/ipLite";


export let rules: Obj<FWRule>[]
const fk = (fr: Obj<FWRule>) => `${fr.ip}-${fr.headers}-${fr.country}-${fr.path}`
export const addRule = (fr: FWRule) => {
    const r = rules.find(a => fk(a) === fk(fr))
    if (r) {
        db.save(Object.assign(r, filter(fr, ['noAccess', 'log'], false)))
    }
}

export const delRule = (id: number) => {
    const rule = db.get(model(FWRule, {id}))
    if (rule) {
        const r = rules.findIndex(a => fk(a) === fk(rule))
        if (r > -1) rules.splice(r, 1)
        return db.del(rule)?.changes
    }
}

function loadRules() {
    rules = []
    db.all(new FWRule()).forEach(addRule)
    setTimeout(loadRules, 1e3 * 3600 * 72)
}

type log = [number, string, string, string, number, string, string]
export let logCache: log[] = []
const max = 1000
export const reqRLog = (event: RequestEvent, statue: number, mark = '') => {
    const ip = getClientAddr(event)
    const path = event.url.pathname
    if (path === '/api/log') return
    const ua = hds2Str(event.request.headers)
    const r = [Date.now(), ip, path, ua, statue, ipInfo(ip)?.short || '', mark] as log
    logCache.push(r)
    const l = logCache.length
    if (l > max) logCache = logCache.slice(l - max)
}

/**
 * compare
 * @param rule
 * @param target
 */
function match(rule: string, target: string) {
    const rv = rule.startsWith('!')
    if (rv) rule = rule.substring(1)
    const reg = rule.match(/^\/(.*?)\/([gimy]+)?$/)
    let hit = false
    if (reg) {
        try {
            const f = Array.from(new Set(reg[2] || '')).join('')
            const r = new RegExp(reg[1], f)
            if (!r.test(target)) {
                hit = true
            }
        } catch (e) {
            console.log(e)
        }
    } else if (target === rule) {
        hit = true
    }
    return rv ? !hit : hit
}

function matchHeader(h: string, hs: Headers) {
    const s = h.split('\n')
    for (const v of s) {
        const m = v.match(/^\s*([a-z0-9_-]+)\s*:\s*(.*?)\s*$/)
        if (m?.length === 2) {
            const k = m[1]
            const v = m[2]
            const hv = hs.get(k) || ''
            if (!hv) {
                if (v) return false
            } else if (!match(v, hv)) return false
        }
    }
    return true
}

export const fwFilter = (event: RequestEvent): string => {
    if (!db) return ''
    if (!rules) loadRules()
    const ip = getClientAddr(event)
    const path = event.url.pathname
    const headers = event.request.headers
    let o: Obj<FWRule> | undefined
    for (const k of rules) {
        if (k.path && !match(k.path, path)) continue
        if (k.headers && !matchHeader(k.headers, headers)) continue
        if (k.ip && !ipRangeCheck(ip, k.ip)) continue
        if (!o) o = {mark: ''}
        if (k.mark) o.mark = o.mark?.split(',').concat(k.mark).join()
        Object.assign(o, filter(k, ['noAccess', 'log'], false))
    }
    if (o) {
        const rs = o.mark || 'unknown'
        if (o.log) {
            db.save(model(FwLog, {
                path, ip, mark: o.mark, headers: hds2Str(headers)
            }))
        }
        if (o.noAccess) {
            return rs
        }
        if (ip && o.country) {
            const f = ipInfo(ip)
            if (f && f.short === o.country) return rs
        }
    }
    return ''
}

type times = number
type expire = number
type bkRec = [times, expire, Timer]
const bkLis = new Map<string, bkRec>()
export const blockIp = (key: string, ip: string): [bkRec, () => void] => {
    const k = `${key}-${ip}`
    const q = (bkLis.get(k) || [0, 0, null]) as bkRec
    return [q, () => {
        if (q[2]) clearTimeout(q[2])
        if (!q[0]) {
            bkLis.delete(k)
        } else {
            bkLis.set(k, q as bkRec)
            q[2] = setTimeout(() => {
                q[1] = 0
                bkLis.set(k, q)
            }, q[1])
        }
    }]
}
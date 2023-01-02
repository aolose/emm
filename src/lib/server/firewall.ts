import type {RequestEvent} from "@sveltejs/kit";
import ipRangeCheck from 'ip-range-check'
import {db} from "$lib/server/index";
import {FwLog, FWRule} from "$lib/server/model";
import {filter, hds2Str, str2Hds} from "$lib/utils";
import type {Obj, Timer} from "$lib/types";
import {getClientAddr, model} from "$lib/server/utils";
import {ipInfo} from "$lib/server/ipLite";


export let rules: FWRule[]
const fk = (fr: Obj<FWRule>) => `${fr.ip}-${fr.headers}-${fr.country}-${fr.path}`
export const addRule = (fr: FWRule) => {
    db.save(fr)
    const r = rules.findIndex(a => a.id === fr.id)
    if (r === -1) {
        rules.push(fr)
    } else rules[r] = fr
}

export const delRule = (ids: number[]) => {
    db.delByPk(FWRule, ids)
    rules = rules.filter(a => ids.indexOf(a.id) === -1)
}

function loadRules() {
    rules = db.all(model(FWRule))
    setTimeout(loadRules, 1e3 * 3600 * 72)
}

type log = [number, string, string, string, number, string, string, string]
export let logCache: log[] = []
const max = 1000
export const reqRLog = (event: RequestEvent, statue: number, mark = '') => {
    const ip = getClientAddr(event)
    const path = event.url.pathname
    const method = event.request.method
    if (path === '/api/log') return
    const ua = hds2Str(event.request.headers)
    const r = [Date.now(), ip, path, ua, statue, ipInfo(ip)?.short || '', mark, method] as log
    logCache.push(r)
    const l = logCache.length
    if (l > max) logCache = logCache.slice(l - max)
}

export const fw2log = (l: FwLog) => {
    return [l.save, l.ip, l.path, l.headers, 0, ipInfo(l.ip)?.short || '', l.mark, l.method] as log
}
export const filterLog = (logs: log[], t: FWRule) => {
    return logs.filter(a => {
        if (t.headers && !matchHeader(t.headers, new Headers(str2Hds(a[3])))) return
        if (t.path && !match(t.path, a[2])) return;
        if (t.ip && !ipRangeCheck(a[1], t.ip)) return;
        if (t.country && !match(t.country, a[5])) return;
        if (t.method && a[6].toLowerCase() !== t.method.toLowerCase()) return;
        return true;
    })
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
            if (r.test(target)) {
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
    const method = event.request.method.toLowerCase()
    let o: Obj<FWRule> | undefined
    for (const k of rules) {
        if (!k.active) continue
        if (k.path && !match(k.path, path)) continue
        if (k.method && k.method.toLowerCase() !== method) continue
        if (k.headers && !matchHeader(k.headers, headers)) continue
        if (k.ip && !ipRangeCheck(ip, k.ip)) continue
        if (!o) o = {mark: ''}
        if (k.mark) o.mark = o.mark?.split(',').concat(k.mark).filter(a => a.replace(/^\s+|\s+$/g, '')).join()
        Object.assign(o, filter(k, ['noAccess', 'log'], false))
    }
    if (o) {
        const rs = o.mark || 'unknown'
        if (o.log) {
            db.save(model(FwLog, {
                path, ip, mark: o.mark, headers: hds2Str(headers), method
            }))
        }
        if (o.noAccess) {
            return rs
        }
        if (ip && o.country) {
            const f = ipInfo(ip)
            if (f && match(o.country, f.short || '')) return rs
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
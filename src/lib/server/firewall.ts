import type {RequestEvent} from "@sveltejs/kit";
import ipRangeCheck from 'ip-range-check'
import {db} from "$lib/server/index";
import {FwLog, FWRule} from "$lib/server/model";
import {filter} from "$lib/utils";
import type {Obj} from "$lib/types";
import {getClientAddr, model} from "$lib/server/utils";
import {info} from "$lib/server/ipLite";


export let rules: Obj<FWRule>[]
const fk = (fr: Obj<FWRule>) => `${fr.ip}-${fr.ua}-${fr.country}-${fr.path}`
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

export const hitFwRules = (t: FWRule) => {
    const ip = t.ip
    const path = t.path
    const ua = t.ua
    const ids = []
    for (const k of rules) {
        if (k.path && path !== k.path) continue
        if (k.ua && new RegExp(ua).test(ua)) continue
        if (k.ip && ipRangeCheck(ip, k.ip)) continue
        ids.push(k.ip)
    }
    return ids
}
let logCache: [string, string, string, number][] = []
const max = 1000
export const fwFilter = (event: RequestEvent) => {
    if (!db) return false
    if (!rules) loadRules()
    const ip = getClientAddr(event)
    const path = event.url.pathname
    const ua = event.request.headers.get('user-agent') || ''
    logCache.push([ip, path, ua, Date.now()])
    const l = logCache.length
    if (l > max) logCache = logCache.slice(l - max)
    let o: Obj<FWRule> | undefined
    for (const k of rules) {
        if (k.path && path !== k.path) continue
        if (k.ua && new RegExp(ua).test(ua)) continue
        if (k.ip && ipRangeCheck(ip, k.ip)) continue
        if (!o) o = {}
        Object.assign(o, filter(k, ['noAccess', 'log'], false))
    }
    if (o) {
        if (o.log) {
            db.save(model(FwLog, {
                ua, path, ip, mark: o.noAccess ? 'no access' : ''
            }))
        }
        if (o.noAccess) {
            return true
        }
        if (ip && o.country) {
            const f = info(ip)
            if (f && f.short === o.country) return true
        }
    }
    return false
}
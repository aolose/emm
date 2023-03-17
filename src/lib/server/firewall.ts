import type { RequestEvent } from '@sveltejs/kit';
import ipRangeCheck from 'ip-range-check';
import { db, sys } from '$lib/server/index';
import { BlackList, FwLog, FWRule } from '$lib/server/model';
import { filter, hds2Str, str2Hds, trim } from '$lib/utils';
import type { Obj, Timer } from '$lib/types';
import { debugMode, getClient, getClientAddr, model } from "$lib/server/utils";
import { ipInfo } from '$lib/server/ipLite';
import { permission } from "$lib/enum";

export let triggers: FWRule[];
export let rules: FWRule[];
export let blackList: BlackList[];

function sort() {
	triggers.sort((a, b) => b.createAt - a.createAt);
	rules.sort((a, b) => b.createAt - a.createAt);
}

export const addRule = (fr: FWRule) => {
	db.save(fr);
	const isTrigger = fr.trigger;
	const ir = triggers.findIndex((a) => a.id === fr.id);
	const iu = rules.findIndex((a) => a.id === fr.id);
	if (!isTrigger) {
		if (ir !== -1) triggers.splice(ir, 1);
		else if (iu === -1) rules=[fr].concat(rules);
		else rules[iu] = fr;
	} else {
		if (iu !== -1) rules.splice(iu, 1);
		else if (ir === -1) [fr].concat(triggers);
		else triggers[ir] = fr;
	}
	sort();
};

const isInRange = (str: string, num: number | undefined) => {
	if (num) {
		const group = str.split(/['; ]+/);
		for (const g of group) {
			const [a, b] = g.split(/[-~]/, 2);
			if (/\d+/g.test(a)) {
				if (num >= +a) {
					if (/\d+/g.test(b)) {
						if (num > +b) return false;
					}
					return true;
				}
			}
		}
	}
	return false;
};
const hitRule = (
	r: {
		ip?: string;
		path?: string;
		method?: string;
		status?: number;
		headers?: Headers;
	},
	k: FWRule
) => {
	const { path = '', ip = '', method = '', headers, status } = r;
	if (!k.active) return false;
	if (k.path && !match(k.path, path)) return false;
	if (k.status && !isInRange(k.status, status)) return false;
	if (k.method) {
		const ms = k.method
			.toLowerCase()
			.split(',')
			.filter((a) => a);
		const mms = new Set(ms);
		if (!mms.has(method.toLowerCase())) return false;
	}
	if (k.headers && !matchHeader(k.headers, headers || new Headers())) return false;
	if (k.ip) {
		if (!ipRangeCheck(ip, k.ip)) return false;
		if (k.country) {
			const f = ipInfo(ip);
			if (f && f.short) {
				if (!match(k.country, f.short)) return false;
			}
		}
	}
	return true;
};
export const ruleHit = (
	r: {
		ip?: string;
		path?: string;
		method?: string;
		status?: number;
		headers?: Headers;
	},
	rs = rules
) => {
	let o: Obj<FWRule> | undefined;
	console.log(rs);
	for (const k of rs) {
		if (!hitRule(r, k)) continue;
		if (!o) o = { mark: '', _match: [] };
		o._match?.push(k.id);
		if (k.mark)
			o.mark = o.mark
				?.split(',')
				.concat(k.mark)
				.filter((a) => trim(a))
				.join();
		Object.assign(o, filter({ ...k }, ['forbidden', 'log'], false));
	}
	return o;
};
export const lsRules = (page: number, size: number) => {
	const r = rules.concat(triggers).filter((a) => a.id > 0);
	r.sort((a, b) => b.createAt - a.createAt);
	return r.slice(size * (page - 1), size * page);
};
export const delRule = (ids: number[]) => {
	db.delByPk(FWRule, ids);
	rules = rules.filter((a) => ids.indexOf(a.id) === -1);
	triggers = triggers.filter((a) => ids.indexOf(a.id) === -1);
};
let t: Timer;
export function loadRules() {
	rules = [];
	triggers = [];
	db.all(model(FWRule)).forEach((a) => {
		if (a.trigger) triggers.push(a);
		else rules.push(a);
	});
	blackList = db.all(model(BlackList)).map((a) => model(BlackList, a) as BlackList);
	blackList.forEach((a) => {
		rules.push(a.toRule());
	});
	sort();
	clearTimeout(t);
	t = setTimeout(loadRules, 1e3 * 3600 * 72);
}

type log = [number, string, string, string, number, string, string, string];
export let logCache: log[] = [];
const max = 1000;

const addBlackListRule = (ip: string) => {
	if (blackList.find((a) => a.ip === ip)) return;
	const b = model(BlackList, { ip }) as BlackList;
	db.save(b);
	blackList.push(b);
	rules.push(b.toRule());
};

export const delBlackList = (...id: number[]) => {
	const ids = new Set(id);
	if (!ids.size) return;
	db.delByPk(BlackList, id);
	blackList = blackList.filter((a) => !ids.has(a.id));
	rules = rules.filter((r) => !ids.has(-r.id));
};

export const blackLists = (page = 1, size = 20) => {
	const bs = blackList.slice(size * (page - 1), size * page).map((a) => {
		a._geo = ipInfo(a.ip).full;
		return a;
	});
	return {
		total: Math.ceil(blackList.length / size),
		items: bs
	};
};
const blackListCheck = (r: {
	ip: string;
	path?: string;
	method?: string;
	status?: number;
	headers?: Headers;
}) => {
	const ts = triggers.filter((a) => hitRule(r, a));
	const times = ts.map((a) => a.times);
	if (ts.length) {
		const dur = 1e3 * 3600;
		const after = Date.now() - dur;
		for (let i = logCache.length - 1; i > -1; i--) {
			const log = logToReq(logCache[i]);
			if (log.createAt < after || log.ip !== r.ip) return;
			for (let i = 0; i < ts.length; i++) {
				const t = ts[i];
				if (hitRule(log, t)) {
					const n = times[i] - 1;
					if (!n) {
						ts.slice(i, 1);
						return addBlackListRule(r.ip);
					} else times[i] = n;
				}
			}
		}
	}
};

export const reqRLog = (event: RequestEvent, status: number, fr?: Obj<FWRule>) => {
	// skip admin
	const ip = getClientAddr(event);
	if(!debugMode&&getClient(event.request)?.ok(permission.Admin)||ip==='127.0.0.1')return;
	const path = event.url.pathname;
	const method = event.request.method;
	const ua = hds2Str(event.request.headers);
	const r = [Date.now(), ip, path, ua, status, ipInfo(ip)?.short || '', fr?.mark, method] as log;
	const rq = logToReq(r);
	if (!fr?._match?.find((a) => a < 0) && triggers.find((a) => hitRule(rq, a))) {
		blackListCheck(rq);
	}
	logCache.push(r);
	const l = logCache.length;
	if (l > max) logCache = logCache.slice(l - max);
	if (fr?.log) {
		db.save(
			model(FwLog, {
				path,
				ip,
				mark: fr.mark,
				headers: ua,
				method,
				status
			})
		);
		const del = db.count(FwLog) - (sys.maxFireLogs || 1000);
		if (del > 100) {
			db.db.prepare(`DELETE FROM FwLog WHERE id in (SELECT id FROM FwLog LIMIT ${del})`).run();
		}
	}
};

export const patchDetailIpInfo = (d: log[]) => {
	const v: log[] = [];
	d.forEach((a) => {
		const n: log = [...a];
		n[5] = ipInfo(a[1]).full || '';
		v.push(n);
	});
	return v;
};
export const fw2log = (l: FwLog) => {
	return [
		l.save,
		l.ip,
		l.path,
		l.headers,
		l.status,
		ipInfo(l.ip)?.short || '',
		l.mark,
		l.method
	] as log;
};

const logToReq = (l: log) => {
	const [createAt, ip, path, headers, status, , , method] = l;
	return {
		createAt,
		ip,
		path,
		headers: new Headers(str2Hds(headers)),
		status,
		method
	};
};

export const filterLog = (logs: log[], t: FWRule) => {
	return logs.filter((a) => {
		if (t.headers && !matchHeader(t.headers, new Headers(str2Hds(a[3])))) return;
		if (t.path && !match(t.path, a[2])) return;
		if (t.ip && !ipRangeCheck(a[1], t.ip)) return;
		if (t.country && !match(t.country, a[5])) return;
		if (t.method && a[6].toLowerCase() !== t.method.toLowerCase()) return;
		return true;
	});
};

/**
 * compare
 * @param rule
 * @param target
 */
function match(rule: string, target: string) {
	const rv = rule.startsWith('!');
	if (rv) rule = rule.substring(1);
	const reg = rule.match(/^\/(.*?)\/([gimy]+)?$/);
	let hit = false;
	if (reg) {
		try {
			const f = Array.from(new Set(reg[2] || '')).join('');
			const r = new RegExp(reg[1], f);
			if (r.test(target)) {
				hit = true;
			}
		} catch (e) {
			console.log(e);
		}
	} else if (target === rule) {
		hit = true;
	}
	return rv ? !hit : hit;
}

function matchHeader(h: string, hs: Headers) {
	const s = h.split('\n');
	for (const v of s) {
		const m = v.match(/^\s*([a-z0-9_-]+)\s*:\s*(.*?)\s*$/);
		if (m && m.length === 3) {
			const k = m[1];
			const v = m[2];
			const hv = hs.get(k) || '';
			if (!match(v, hv)) return false;
		}
	}
	return true;
}

export const fwFilter = (event: RequestEvent, rs = rules): Obj<FWRule> | undefined => {
	if (!db) return;
	if (!rs || !rs.length) loadRules();
	const ip = getClientAddr(event);
	if (ip === '127.0.0.1' && !debugMode) return;
	const path = event.url.pathname;
	const headers = event.request.headers;
	const method = event.request.method.toLowerCase();
	return ruleHit({
		ip,
		path,
		headers,
		method
	});
};

type times = number;
type expire = number;
type bkRec = [times, expire, Timer];
const bkLis = new Map<string, bkRec>();
export const blockIp = (key: string, ip: string): [bkRec, () => void] => {
	const k = `${key}-${ip}`;
	const q = (bkLis.get(k) || [0, 0, null]) as bkRec;
	return [
		q,
		() => {
			if (q[2]) clearTimeout(q[2]);
			if (!q[0]) {
				bkLis.delete(k);
			} else {
				bkLis.set(k, q as bkRec);
				q[2] = setTimeout(() => {
					q[1] = 0;
					bkLis.set(k, q);
				}, q[1]);
			}
		}
	];
};

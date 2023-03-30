import type { RequestEvent } from '@sveltejs/kit';
import { matches } from 'ip-matching';
import { db, sys } from '$lib/server/index';
import { BlackList, FwLog, FwResp, FWRule } from '$lib/server/model';
import { arrFilter, hasFwRuleFilter, hds2Str, str2Hds, trim } from '$lib/utils';
import type { Obj, Timer } from '$lib/types';
import { debugMode, getClient, getClientAddr, model } from '$lib/server/utils';
import { ipInfo, ipInfoStr } from '$lib/server/ipLite';
import { permission } from '$lib/enum';
import { ruv } from '$lib/server/puv';

let triggers: FWRule[];
let rules: FWRule[];
let blackList: BlackList[];
const fwResp = new Map<number, FwResp>();

function sort() {
	triggers.sort((a, b) => b.createAt - a.createAt);
	rules.sort((a, b) => b.createAt - a.createAt);
}

export const delFwResp = (id: number) => {
	db.delByPk(FwResp, [id]);
	fwResp.delete(id);
};
export const setFwResp = (r: Obj<FwResp>) => {
	const exist = r.id;
	if (r.id) {
		const o = fwResp.get(r.id);
		if (o) Object.assign(o, r);
	}
	db.save(r);
	if (!exist && r.id) fwResp.set(r.id, r as FwResp);
	return r.id;
};
export const fwRespLis = () => {
	const ls = [...fwResp.values()];
	ls.sort((a, b) => b.createAt - a.createAt);
	return arrFilter(ls, ['id', 'name', 'headers', 'status']);
};
export const addRule = (fr: FWRule) => {
	db.save(fr);
	const ir = triggers.findIndex((a) => a.id === fr.id);
	const iu = rules.findIndex((a) => a.id === fr.id);
	let o: FWRule = fr;
	if (ir !== -1) o = Object.assign(triggers[ir], fr);
	else if (iu !== -1) o = Object.assign(rules[iu], fr);
	const isTrigger = o.trigger;
	if (isTrigger) {
		if (ir === -1) {
			if (iu !== -1) rules.splice(iu, 1);
			triggers = [o].concat(triggers);
		}
	} else {
		if (iu === -1) {
			if (ir !== -1) triggers.splice(ir, 1);
			rules = [o].concat(rules);
		}
	}
	sort();
};

const isInRange = (str: string, num: number | undefined) => {
	if (num) {
		const group = str.split(/[,; ]+/);
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
		if (!matches(ip, k.ip)) return false;
		if (k.country) {
			if (!match(k.country, ipInfoStr(ip))) return false;
		}
	}
	return true;
};
export const getFwResp = (id?: number) =>
	id ? fwResp.get(id)?.toResp() || new Response('', { status: 403 }) : undefined;
export const hitRules = (
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
	for (const k of rs) {
		if (!hitRule(r, k)) continue;
		if (!o) o = { mark: '' };
		if (k.mark)
			o.mark = o.mark
				?.split(',')
				.concat(k.mark)
				.filter((a) => trim(a))
				.join();
		if (k.log) o.log = k.log;
		if (k.respId || k.id < 0) {
			o.respId = k.respId || -1;
			break;
		}
	}
	return o;
};
export const lsRules = (page: number, size: number) => {
	const r = rules.concat(triggers).filter((a) => a.id > 0);
	r.sort((a, b) => b.createAt - a.createAt);
	return {
		items: r.slice(size * (page - 1), size * page),
		total: Math.ceil(r.length / size)
	};
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
		if (a.trigger) triggers.push(model(FWRule, a) as FWRule);
		else rules.push(a);
	});
	blackList = db.all(model(BlackList)).map((a) => model(BlackList, a) as BlackList);
	blackList.forEach((a) => {
		rules.push(a.toRule());
	});
	sort();
	clearTimeout(t);
	t = setTimeout(loadRules, 1e3 * 3600 * 72);
	fwResp.clear();
	db.all(model(FwResp)).forEach((a) => fwResp.set(a.id, model(FwResp, a) as FwResp));
}

type log = {
	createAt: number;
	ip: string;
	path: string;
	headers: Headers;
	status: number;
	method: string;
	mark?: string;
	geo?: string;
};
export let logCache: log[] = [];
const max = 1000;

const addBlackListRule = (r: { ip: string; respId: number; mark?: string }) => {
	if (blackList.find((a) => a.ip === r.ip)) return;
	const b = model(BlackList, r) as BlackList;
	if (!fwResp.has(r.respId)) b.respId = 0;
	db.save(b);
	blackList.push(b);
	rules.push(b.toRule());
};

export const saveBlackList = (b: BlackList) => {
	db.save(b);
	const i = blackList.findIndex((a) => a.id === b.id);
	if (i !== -1) {
		b = Object.assign(blackList[i], b);
		const n = rules.findIndex((a) => a.id === -b.id);
		if (n !== -1) Object.assign(rules[n], b.toRule());
	}
};
export const delBlackList = (...id: number[]) => {
	const ids = new Set(id);
	if (!ids.size) return;
	db.delByPk(BlackList, id);
	blackList = blackList.filter((a) => !ids.has(a.id));
	rules = rules.filter((r) => !ids.has(-r.id));
};

export const blackLists = (page = 1, size = 20) => {
	blackList.sort((a, b) => b.createAt - a.createAt);
	const bs = blackList.slice(size * (page - 1), size * page).map((a) => {
		a._geo = ipInfoStr(a.ip);
		return a;
	});
	return {
		total: Math.ceil(blackList.length / size),
		items: arrFilter(bs, ['id', 'ip', 'mark', 'respId', 'createAt', '_geo'], false)
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
	const now = Date.now();
	const times: number[] = [];
	const max: number[] = [];
	const matches = ts.map((a) => {
		times.push(0);
		const [mx, limiter] = a.rateLimiter();
		max.push(mx);
		return limiter;
	});
	if (ts.length) {
		for (let i = logCache.length - 1; i > -1; i--) {
			const log = logCache[i];
			const dur = now - log.createAt;
			if (log.ip !== r.ip) return;
			let over = 0;
			for (let i = 0; i < ts.length; i++) {
				if (dur > max[i]) {
					over++;
					continue;
				}
				const t = ts[i];
				if (hitRule(log, t)) {
					const tm = (times[i] = times[i] + 1);
					const n = matches[i](tm, dur);
					if (n) {
						addBlackListRule({
							ip: r.ip,
							respId: t.respId,
							mark: t.mark
						});
						return t;
					}
				}
			}
			if (over === max.length) return;
		}
	}
};

export const reqRLog = (event: RequestEvent, status: number, fr?: Obj<FWRule>) => {
	let resp: Response | undefined;
	// skip admin
	const ip = getClientAddr(event);
	if (!debugMode && (getClient(event.request)?.ok(permission.Admin) || /^(::1|127\.0)/.test(ip)))
		return;
	const {
		request: { method, headers },
		url: { pathname }
	} = event;
	const path = pathname;
	const r = {
		createAt: Date.now(),
		ip,
		path,
		headers,
		status,
		ipInfo,
		mark: fr?.mark,
		method
	} as log;
	ruv({ ip, path, ua: headers.get('user-agent') || '', status });
	if (path !== '/api/log') logCache.push(r);
	if (!fr?.respId && triggers.find((a) => hitRule(r, a))) {
		const o = blackListCheck(r);
		if (o) {
			o.respId = o.respId || -1;
			resp = getFwResp(o.respId);
			if (resp) r.status = status = resp.status;
		}
	}
	const l = logCache.length;
	if (l > max) logCache = logCache.slice(l - max);
	if (fr?.log) {
		db.save(
			model(FwLog, {
				path,
				ip,
				mark: fr.mark,
				headers: hds2Str(headers),
				method,
				status
			})
		);
		const del = db.count(FwLog) - (sys.maxFireLogs || 1000);
		if (del > 100) {
			db.db.prepare(`DELETE FROM FwLog WHERE id in (SELECT id FROM FwLog LIMIT ${del})`).run();
		}
	}
	return resp;
};

export const patchDetailIpInfo = (d: log[]) => {
	return d.map((a) => {
		return [
			a.createAt,
			a.ip,
			a.path,
			hds2Str(a.headers),
			a.status,
			a.method,
			a.mark,
			ipInfoStr(a.ip)
		];
	});
};
export const fw2log = (l: FwLog) => {
	return {
		createAt: l.save,
		ip: l.ip,
		path: l.path,
		headers: new Headers(str2Hds(l.headers)),
		status: l.status,
		mark: l.mark,
		method: l.method
	} as log;
};

export const filterLog = (logs: log[], t: FWRule) => {
	return hasFwRuleFilter(t)
		? logs.filter((a) => hitRule(a, { ...t, active: true } as FWRule))
		: logs;
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
	if (/^(::1|127\.0)/.test(ip) && !debugMode) return;
	const path = event.url.pathname;
	const headers = event.request.headers;
	const method = event.request.method.toLowerCase();
	return hitRules({
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

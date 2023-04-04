import type { RequestEvent } from '@sveltejs/kit';
import { matches } from 'ip-matching';
import { db, sys } from '$lib/server/index';
import { BlackList, FwLog, FwResp, FWRule } from '$lib/server/model';
import { arrFilter, hasFwRuleFilter, hds2Str, str2Hds, trim } from '$lib/utils';
import type { Obj, Timer } from '$lib/types';
import { checkRedirect, getClient, getClientAddr, model, sysStatue } from '$lib/server/utils';
import { ipInfo, ipInfoStr } from '$lib/server/ipLite';
import { permission } from '$lib/enum';
import { ruv } from '$lib/server/puv';
import { error } from '@sveltejs/kit';

let triggers: FWRule[];
let rules: FWRule[];
let blackList: BlackList[];
const fwResp = new Map<number, FwResp>();

const getPathName = (u:URL|string)=>{
	u = new URL(u)
	return decodeURIComponent(u.href.slice(u.origin.length))
}

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
	log: {
		ip?: string;
		path?: string;
		method?: string;
		status?: number;
		headers?: Headers;
	},
	rule: FWRule
) => {
	const { path = '', ip = '', method = '', headers, status } = log;
	if (!rule.active) return false;
	if (rule.path && !matchRuleValue(rule.path, path)) return false;
	if (rule.status && !isInRange(rule.status, status)) return false;
	if (rule.method) {
		const ms = rule.method
			.toLowerCase()
			.split(',')
			.filter((a) => a);
		const mms = new Set(ms);
		if (!mms.has(method.toLowerCase())) return false;
	}
	if (rule.headers && !matchHeader(rule.headers, headers || new Headers())) return false;
	if (rule.ip) {
		if (!matches(ip, rule.ip)) return false;
		if (rule.country) {
			if (!matchRuleValue(rule.country, ipInfoStr(ip))) return false;
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
	fwResp.clear();
	db.all(model(FWRule)).forEach((a) => {
		const ru = model(FWRule, a) as FWRule;
		if (a.trigger) triggers.push(ru);
		else rules.push(ru);
	});
	blackList = db.all(model(BlackList)).map((a) => model(BlackList, a) as BlackList);
	blackList.forEach((a) => {
		rules.push(a.toRule());
	});
	sort();
	clearTimeout(t);
	t = setTimeout(loadRules, 1e3 * 3600 * 72);
	db.all(model(FwResp)).forEach((a) => fwResp.set(a.id, model(FwResp, a) as FwResp));
}

type log = {
	createAt: number;
	ip: string;
	path: string;
	headers: Headers;
	status?: number;
	method: string;
	mark?: string;
	geo?: string;
	log?: boolean;
};
export const logCache: log[] = [];
const max = 1000;

const addBlackListRule = (r: { ip: string; respId: number; mark?: string; log?: boolean }) => {
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
const blackListCheck = (
	r: {
		ip: string;
		path?: string;
		method?: string;
		status?: number;
		headers?: Headers;
	},
	tr: FWRule[]
) => {
	const ts = tr.filter((a) => hitRule(r, a));
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
							mark: t.mark,
							log: t.log
						});
						return t;
					}
				}
			}
			if (over === max.length) return;
		}
	}
};

const triggersHit = (tr: FWRule[], r: log) => {
	if (!tr.length) return;
	if (tr.find((a) => hitRule(r, a))) {
		const o = blackListCheck(r, tr);
		if (o) {
			o.respId = o.respId || -1;
			if (o.mark) r.mark = o.mark;
			if (o.log) r.log = o.log;
			const res = getFwResp(o.respId);
			if (res) {
				r.status = res.status;
				return res;
			}
		}
	}
};

export const saveToDb = (r: log) => {
	db.save(model(FwLog, { ...r, headers: hds2Str(r.headers) }));
	const del = db.count(FwLog) - (sys.maxFireLogs || max);
	if (del > 100) {
		db.db.prepare(`DELETE FROM FwLog WHERE id in (SELECT id FROM FwLog LIMIT ${del})`).run();
	}
};

const logReq = (event: RequestEvent) => {
	// skip admin
	const ip = getClientAddr(event);
	const {
		request: { method, headers },
		url
	} = event;
	const path = getPathName(url)
	const r = {
		createAt: Date.now(),
		ip,
		path,
		headers,
		ipInfo,
		method
	} as log;
	if (path !== '/api/log') {
		logCache.push(r);
		const s = logCache.length-max
		if (s >  100) {
			logCache.splice(0, s);
		}
	}
	return r;
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

function matchRuleValue(value: string, target: string) {
	const rv = value.startsWith('!');
	if (rv) value = value.substring(1);
	const reg = value.match(/^\/(.*?)\/([gimy]+)?$/);
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
	} else if (target === value) {
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
			if (!matchRuleValue(v, hv)) return false;
		}
	}
	return true;
}

const fwFilter = (event: RequestEvent, rs = rules): Obj<FWRule> | undefined => {
	if (!db) return;
	if (!rs || !rs.length) loadRules();
	const ip = getClientAddr(event);
	const path = getPathName(event.url);
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

export const firewallProcess = async (event: RequestEvent, handle: () => Promise<Response>) => {
	let res: Response | undefined;
	const pn = getPathName(event.url);
	const skipLog =
		getClient(event.request)?.ok(permission.Admin) || /^(::1|127\.0)/.test(getClientAddr(event));

	if (!/^\/(api|res|font|src)/.test(pn)) {
		const p = checkRedirect(sysStatue, pn, event.request);
		if (p) {
			res = new Response('', {
				status: 307,
				headers: new Headers({
					location: p
				})
			});
		}
	}

	if (skipLog) {
		return res || (await handle());
	}

	const fr = fwFilter(event);
	if (fr?.respId) {
		res = getFwResp(fr.respId);
	}
	const log = logReq(event);
	if (fr) {
		log.mark = fr.mark;
		if (fr.respId) {
			res = getFwResp(fr.respId);
		}
	}
	const sTr: FWRule[] = [];
	const nTr: FWRule[] = [];
	triggers.forEach((a) => {
		if (a.status) sTr.push(a);
		else nTr.push(a);
	});
	if (res) {
		log.status = res?.status;
	} else {
		res = triggersHit(nTr, log);
	}
	if (!res) {
		res = await handle();
		log.status = res.status;
		res = triggersHit(sTr, log) || res;
	}
	if (fr?.log || log.log) {
		saveToDb(log);
	}
	if (res) {
		ruv({
			ip: log.ip,
			path: log.path,
			ua: log.headers.get('user-agent') || '',
			status: res.status
		});
		return res;
	}
	throw error(400);
};

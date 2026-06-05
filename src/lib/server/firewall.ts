import type { RequestEvent } from '@sveltejs/kit';
import { matches } from 'ip-matching';
import { db, sys } from '$lib/server/index';
import { BlackList, FwLog, FwResp, FWRule, WhiteList } from '$lib/server/model';
import { arrFilter, hasFwRuleFilter, hds2Str, str2Hds, trim } from '$lib/utils';
import type { Obj, Timer } from '$lib/types';
import { checkRedirect, getClient, getClientAddr, model, sysStatue } from '$lib/server/utils';
import { ipInfo, ipInfoStr } from '$lib/server/ipLite';
import { permission } from '$lib/enum';
import { ruv } from '$lib/server/puv';
import { error } from '@sveltejs/kit';
import { isTsVerified, challengeResponse } from '$lib/server/turnstile';

let triggers: FWRule[];
let rules: FWRule[];
let blackList: BlackList[];
let whiteList: WhiteList[];
const exactWhiteIp = new Map<string, true>();
let cidrWhiteRules: WhiteList[] = [];
const exactBlackIp = new Map<string, FWRule>();
let cidrBlackRules: FWRule[] = [];
const fwResp = new Map<number, FwResp>();

const rebuildWhiteIndex = () => {
	exactWhiteIp.clear();
	cidrWhiteRules = [];
	for (const w of whiteList) {
		if (w.ip && /[\/-]/.test(w.ip)) {
			cidrWhiteRules.push(w);
		} else if (w.ip) {
			exactWhiteIp.set(w.ip, true);
		}
	}
};

const rebuildBlackIndex = () => {
	exactBlackIp.clear();
	cidrBlackRules = [];
	for (const b of blackList) {
		const r = b.toRule();
		if (r.ip && /[\/-]/.test(r.ip)) {
			cidrBlackRules.push(r);
		} else if (r.ip) {
			exactBlackIp.set(r.ip, r);
		}
	}
};

const getPathName = (u: URL | string) => {
	u = new URL(u);
	return decodeURIComponent(u.href.slice(u.origin.length));
};

function sort() {
	const byWeight = (a: FWRule, b: FWRule) => {
		const wd = (b.weight ?? 100) - (a.weight ?? 100);
		return wd || b.createAt - a.createAt;
	};
	triggers.sort(byWeight);
	rules.sort(byWeight);
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
						if (num > +b) continue;
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
	if (!rule.isInSchedule()) return false;
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
	if (rule.country) {
		const cfCountry = (headers || log.headers)?.get('cf-ipcountry')?.toUpperCase() || undefined;
		if (!matchRuleValue(rule.country, ipInfoStr(ip, cfCountry))) return false;
	}
	if (rule.ip && !matches(ip, rule.ip)) return false;
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
		// CF upload — push matching IP for any rule with cfUpload enabled
		if (k.cfUpload && sys.cfAccountId && sys.cfApiToken && sys.cfListId && r.ip) {
			pushIpToCf(r.ip, k.mark).catch((e) =>
				console.error('[cf] rule push failed:', r.ip, e)
			);
		}
		if (k.respId || k.id < 0) {
			o.respId = k.respId || -1;
			break;
		}
	}
	return o;
};
export const lsRules = (page: number, size: number) => {
	const r = rules.concat(triggers).filter((a) => a.id > 0);
	r.sort((a, b) => {
		const wd = (b.weight ?? 100) - (a.weight ?? 100);
		return wd || b.createAt - a.createAt;
	});
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
	whiteList = db.all(model(WhiteList)).map((a) => model(WhiteList, a) as WhiteList);
	rebuildWhiteIndex();
	rebuildBlackIndex();
	sort();
	clearTimeout(t);
	t = setTimeout(loadRules, 1e3 * 3600 * 72);
	db.all(model(FwResp)).forEach((a) => fwResp.set(a.id, model(FwResp, a) as FwResp));
	scheduleAggregate();
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

// #6 ring buffer for logCache — O(1) write, no splice
const MAX_LOG = 1000;
const logCache: log[] = new Array(MAX_LOG);
let logHead = 0;
let logCount = 0;

const addToLogCache = (r: log) => {
	logCache[logHead % MAX_LOG] = r;
	logHead++;
	if (logCount < MAX_LOG) logCount++;
};

export const getLogCacheEntries = (): log[] => {
	const n = logCount;
	const out: log[] = new Array(n);
	for (let i = 0; i < n; i++) out[i] = logCache[(logHead - n + i) % MAX_LOG];
	return out;
};

const forEachLogReverse = (fn: (log: log) => boolean | void) => {
	const start = logHead - 1;
	const end = Math.max(0, logHead - logCount);
	for (let i = start; i >= end; i--) {
		const r = logCache[i % MAX_LOG];
		if (fn(r) === false) break;
	}
};

// === Turnstile abandon detection ===
// Track IPs that received a 307 redirect but haven't loaded /ts-challenge.
// Each IP maps to an array of { timeout, timer } tuples — one per active abandon rule.
type AbandonEntry = { timeout: number; timer: ReturnType<typeof setTimeout> };
const pendingAbandons = new Map<string, AbandonEntry[]>();

function markAbandon(ip: string, rule: FWRule): void {
	const timeout = rule.getTimeout() * 1000;
	const entry: AbandonEntry = {
		timeout,
		timer: setTimeout(() => {
			addBlackListRule({
				ip,
				respId: rule.respId,
				mark: rule.mark,
				log: rule.log,
			});
			// CF upload — async fire-and-forget
			if (rule.cfUpload && sys.cfAccountId && sys.cfApiToken && sys.cfListId) {
				pushIpToCf(ip, rule.mark || 'turnstile-abandon').catch((e) =>
					console.error('[cf] abandon push failed:', ip, e)
				);
			}
			// Remove this entry from the array
			const entries = pendingAbandons.get(ip);
			if (entries) {
				const idx = entries.indexOf(entry);
				if (idx !== -1) entries.splice(idx, 1);
				if (!entries.length) pendingAbandons.delete(ip);
			}
		}, timeout),
	};
	const entries = pendingAbandons.get(ip);
	if (entries) {
		entries.push(entry);
	} else {
		pendingAbandons.set(ip, [entry]);
	}
}

function clearAbandon(ip: string): void {
	const entries = pendingAbandons.get(ip);
	if (entries) {
		for (const e of entries) clearTimeout(e.timer);
		pendingAbandons.delete(ip);
	}
}

// === UA collection-mode ring buffer ===
// Stores recent requests for batch analysis by UA-trigger rules.
// TTL: dynamic based on active uaMode trigger windows, max 1000 entries.
interface UaEntry {
	ip: string;
	ua: string;
	path: string;
	ts: number;
}
const UA_MAX = 1000;
let _uaMaxWindow = 60; // dynamic, updated by scheduleUaAnalysis
const uaEntries: UaEntry[] = [];

// Cloudflare Verified Bot categories — skip logging and UA collection
const CF_TRUSTED_BOT_CATEGORIES = ['Search Engine Crawler', 'Page Preview', 'Feed Fetcher', 'Archiver'];

function recordUaEntry(ip: string, ua: string, path: string): void {
	const now = Date.now();
	uaEntries.push({ ip, ua, path, ts: now });
	// Trim expired — use dynamic max window across all active uaMode triggers
	const cutoff = now - _uaMaxWindow * 1000;
	while (uaEntries.length && uaEntries[0].ts < cutoff) uaEntries.shift();
	// Trim overflow
	while (uaEntries.length > UA_MAX) uaEntries.shift();
}

/** Analyze one collection-mode trigger rule against the uaEntries window.
 *  Returns IPs to block (already deduplicated against isIpBlocked). */
function analyzeUaTrigger(rule: FWRule): string[] {
	const now = Date.now();
	const cutoff = now - rule.getUaWindow() * 1000;
	// Parse rate as count threshold (collection mode: "10" or "10/300" — take count)
	const rateCount = parseInt((rule.rate || '').replace(/[^0-9]/g, '')) || 0;
	if (!rateCount) return [];

	// 1. Filter by path regex (required) and optional UA regex
	const pathPattern = rule.path;
	const uaPattern = rule.ua;
	const matching: UaEntry[] = [];
	for (let i = uaEntries.length - 1; i >= 0; i--) {
		const e = uaEntries[i];
		if (e.ts < cutoff) break; // older entries are before this
		if (!matchRuleValue(pathPattern, e.path)) continue;
		if (uaPattern && !matchRuleValue(uaPattern, e.ua)) continue;
		matching.push(e);
	}

	// 2. Group by exact UA
	const groups = new Map<string, { ips: Set<string>; count: number }>();
	for (const e of matching) {
		let g = groups.get(e.ua);
		if (!g) {
			g = { ips: new Set(), count: 0 };
			groups.set(e.ua, g);
		}
		g.ips.add(e.ip);
		g.count++;
	}

	// 3. Check dual thresholds: distinct IPs >= uaCount AND total requests >= rate
	const uaCountThreshold = rule.getUaCountThreshold();
	const toBlock = new Set<string>();
	for (const [, g] of groups) {
		if (g.ips.size >= uaCountThreshold && g.count >= rateCount) {
			for (const ip of g.ips) {
				if (!isIpBlocked(ip)) toBlock.add(ip);
			}
		}
	}
	return [...toBlock];
}

// === Lazy scheduler ===
// Analysis runs 5s after most recent request; stops when idle.
let _uaTimer: ReturnType<typeof setTimeout> | undefined;
let _uaPending = false;

function runUaAnalysis(): void {
	_uaPending = false;
	if (!triggers) return;
	const activeUa = triggers.filter(
		(t) => t.uaMode && t.active && t.isInSchedule()
	);
	// Update dynamic max window
	_uaMaxWindow = activeUa.length
		? Math.max(...activeUa.map((t) => t.getUaWindow()))
		: 60;
	if (!activeUa.length) return;

	for (const rule of activeUa) {
		const ips = analyzeUaTrigger(rule);
		for (const ip of ips) {
			addBlackListRule({
				ip,
				respId: rule.respId,
				mark: rule.mark,
				log: rule.log,
			});
			// CF upload — async fire-and-forget
			if (rule.cfUpload && sys.cfAccountId && sys.cfApiToken && sys.cfListId) {
				pushIpToCf(ip, rule.mark || 'ua-collection').catch((e) =>
					console.error('[cf] ua push failed:', ip, e)
				);
			}
		}
	}
}

function scheduleUaAnalysis(): void {
	// Only schedule if there is at least one active uaMode trigger
	if (!triggers || !triggers.some((t) => t.uaMode && t.active)) return;
	if (_uaPending) return;
	_uaPending = true;
	clearTimeout(_uaTimer);
	_uaTimer = setTimeout(runUaAnalysis, 5000);
}

let _pushIpToCf: ((ip: string, comment?: string) => Promise<string>) | undefined;

// Throttle "CF not configured" warnings to once per 10 min
let _cfUnconfiguredLogged = 0;

/** Async push IP to Cloudflare list — lazy-loaded to avoid circular imports. */
async function pushIpToCf(ip: string, comment?: string): Promise<void> {
	if (!sys.cfAccountId || !sys.cfApiToken || !sys.cfListId) {
		const now = Date.now();
		if (now - _cfUnconfiguredLogged > 600_000) {
			console.warn('[cf] push skipped — CF not fully configured (account/token/list missing)');
			_cfUnconfiguredLogged = now;
		}
		return;
	}
	if (!_pushIpToCf) {
		const mod = await import('$lib/server/cloudflare');
		_pushIpToCf = mod.addIpToList;
	}
	const opId = await _pushIpToCf(ip, comment);
	if (!opId) {
		console.warn('[cf] push returned empty for', ip, '(may be already in list or API error)');
	}
}

const addBlackListRule = (r: { ip: string; respId: number; mark?: string; log?: boolean }) => {
	if (blackList.find((a) => a.ip === r.ip)) return;
	const b = model(BlackList, r) as BlackList;
	if (!fwResp.has(r.respId)) b.respId = 0;
	db.save(b);
	blackList.push(b);
	const rule = b.toRule();
	if (rule.ip && /[\/-]/.test(rule.ip)) {
		cidrBlackRules.push(rule);
	} else if (rule.ip) {
		exactBlackIp.set(rule.ip, rule);
	}
};

export const saveBlackList = (b: BlackList) => {
	db.save(b);
	const i = blackList.findIndex((a) => a.id === b.id);
	if (i !== -1) {
		b = Object.assign(blackList[i], b);
		rebuildBlackIndex();
	}
};
export const delBlackList = (...id: number[]) => {
	const ids = new Set(id);
	if (!ids.size) return;
	db.delByPk(BlackList, id);
	blackList = blackList.filter((a) => !ids.has(a.id));
	rebuildBlackIndex();
};

export const isIpBlocked = (ip: string): Obj<FWRule> | undefined => {
	const exact = exactBlackIp.get(ip);
	if (exact) return exact;
	return hitRules({ ip }, cidrBlackRules);
};

export const isIpWhitelisted = (ip: string): boolean => {
	if (exactWhiteIp.has(ip)) return true;
	for (const w of cidrWhiteRules) {
		if (matches(ip, w.ip)) return true;
	}
	return false;
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

export const saveWhiteList = (w: WhiteList) => {
	db.save(w);
	const i = whiteList.findIndex((a) => a.id === w.id);
	if (i !== -1) {
		w = Object.assign(whiteList[i], w);
	} else {
		whiteList.push(w);
	}
	rebuildWhiteIndex();
};
export const delWhiteList = (...id: number[]) => {
	const ids = new Set(id);
	if (!ids.size) return;
	db.delByPk(WhiteList, id);
	whiteList = whiteList.filter((a) => !ids.has(a.id));
	rebuildWhiteIndex();
};

export const whiteLists = (page = 1, size = 20) => {
	whiteList.sort((a, b) => b.createAt - a.createAt);
	const ws = whiteList.slice(size * (page - 1), size * page).map((a) => {
		a._geo = ipInfoStr(a.ip);
		return a;
	});
	return {
		total: Math.ceil(whiteList.length / size),
		items: arrFilter(ws, ['id', 'ip', 'mark', 'createAt', '_geo'], false)
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
		let matched: FWRule | undefined;
		forEachLogReverse((log) => {
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
						// CF upload — async fire-and-forget
						if (t.cfUpload && sys.cfAccountId && sys.cfApiToken && sys.cfListId) {
							pushIpToCf(r.ip, t.mark).catch((e) =>
								console.error('[cf] push failed:', r.ip, e)
							);
						}
						matched = t;
						return false;
					}
				}
			}
			if (over === max.length) return false;
		});
		if (matched) return matched;
	}
};

const triggersHit = (tr: FWRule[], r: log) => {
	if (!tr.length) return;
	const matched = tr.find((a) => hitRule(r, a));
	if (matched) {
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
	const del = db.count(FwLog) - (sys.maxFireLogs || MAX_LOG);
	if (del > 100) {
		db.db
			.prepare(
				`DELETE
                   FROM FwLog
                   WHERE id in (SELECT id FROM FwLog LIMIT ?)`
			)
			.run(del);
	}
};

const logReq = (event: RequestEvent) => {
	const ip = getClientAddr(event);
 	const {
		request: { method, headers },
		url
	} = event;
	const path = getPathName(url);
	const r = {
		createAt: Date.now(),
		ip,
		path,
		headers,
		method
	} as log;
	// Skip cache for localhost and authenticated users
	const skipCache = /^(::1|127\.)/.test(ip)
		|| getClient(event.request)?.ok(permission.Read);
	if (path !== '/api/log' && !skipCache) {
		addToLogCache(r);
		// UA collection mode: record for batch analysis (skip CF trusted bots)
		const isCfTrustedBot = headers.get('X-Client-Bot') === 'true'
			&& CF_TRUSTED_BOT_CATEGORIES.includes(headers.get('X-Verified-Bot-Category') || '');
		if (!isCfTrustedBot) {
			const ua = headers.get('user-agent') || '';
			recordUaEntry(ip, ua, path);
			scheduleUaAnalysis();
		}
	}
	return r;
};

export const patchDetailIpInfo = (d: log[]) => {
	return d.map((a) => {
		const cfCountry = a.headers?.get('cf-ipcountry')?.toUpperCase() || undefined;
		return [
			a.createAt,
			a.ip,
			a.path,
			hds2Str(a.headers),
			a.status,
			a.method,
			a.mark,
			ipInfoStr(a.ip, cfCountry)
		];
	});
};
export const fw2log = (l: FwLog) => {
	return {
		createAt: l.createAt,
		ip: l.ip,
		path: l.path,
		headers: new Headers(str2Hds(l.headers)),
		status: l.status,
		mark: l.mark,
		method: l.method
	} as log;
};

export const filterLog = (logs: log[], t: FWRule) => {
	if (!hasFwRuleFilter(t)) return logs;
	const rule = model(FWRule, { ...t, active: true }) as FWRule;
	return logs.filter((a) => hitRule(a, rule));
};

function matchRuleValue(value: string, target: string) {
	if (!value) return true; // null/empty pattern matches everything
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
			console.error(e);
		}
	} else {
		hit = target.toLowerCase().includes(value.toLowerCase());
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
	const r = { ip, path, headers, method };

	const exact = exactBlackIp.get(ip);
	if (exact && hitRule(r, exact)) {
		return { respId: exact.respId || -1, mark: exact.mark, log: exact.log } as Obj<FWRule>;
	}
	const cidrHit = hitRules(r, cidrBlackRules);
	if (cidrHit?.respId) return cidrHit;

	return hitRules(r);
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
	const ip = getClientAddr(event);
	const isApi = pn.startsWith('/api/');

	const isAdmin = getClient(event.request)?.ok(permission.Admin);
	const isAuthenticated = !isAdmin && getClient(event.request)?.ok(permission.Read);
	const isLocalhost = /^(::1|127\.)/.test(ip);
	const skipAll = sysStatue < 2 || isAdmin;

	// Setup not complete — redirect to /config before skipAll bypasses checkRedirect
	if (sysStatue < 2 && !isAdmin && pn !== '/config' && !/^\/(api|res|font|src|manifest\.json|favicon)/.test(pn)) {
		const cr = new Response('', { status: 307, headers: new Headers({ location: '/config' }) });
		return cr;
	}

	if (skipAll) {
		return await handle();
	}

	// /ts-challenge page load — clear pending abandon timers (browser followed 307)
	if (pn.startsWith('/ts-challenge') && !isLocalhost && !isAdmin) {
		clearAbandon(ip);
	}

	// Whitelist check — whitelisted IPs bypass firewall but logging still happens
	if (!isLocalhost && !isAdmin && isIpWhitelisted(ip)) {
		const wlLog = logReq(event);
		res = await handle();
		wlLog.status = res.status;
		if (!isAuthenticated && wlLog.log) {
			saveToDb(wlLog);
		}
		ruv({
			ip: wlLog.ip,
			path: wlLog.path,
			ua: wlLog.headers.get('user-agent') || '',
			status: res.status
		});
		return res;
	}

	// Blacklist check FIRST — block before any other challenge
	const fr = isLocalhost ? undefined : fwFilter(event, rules);
	if (fr?.respId) {
		res = getFwResp(fr.respId);
	}
	if (res) {
		// Block immediately, log and return
		const log = logReq(event);
		log.mark = fr?.mark;
		log.status = res.status;
		if (!isLocalhost && !isAuthenticated && (fr?.log || log.log)) {
			saveToDb(log);
		}
		ruv({
			ip: log.ip,
			path: log.path,
			ua: log.headers.get('user-agent') || '',
			status: res.status
		});
		return res;
	}

	// Non-status trigger rules — run before Turnstile to block early
	const log = logReq(event);
	if (fr) {
		log.mark = fr.mark;
	}
	const sTr: FWRule[] = [];
	const nTr: FWRule[] = [];
	triggers.forEach((a) => {
		if (a.uaMode) return; // collection mode — handled by batch scheduler
		if (a.abandon) return; // abandon mode — handled by turnstile section
		if (a.status) sTr.push(a);
		else nTr.push(a);
	});
	res = triggersHit(nTr, log);
	if (res) {
		log.status = res.status;
		if (!isLocalhost && !isAuthenticated && (fr?.log || log.log)) {
			saveToDb(log);
		}
		ruv({
			ip: log.ip,
			path: log.path,
			ua: log.headers.get('user-agent') || '',
			status: res.status
		});
		return res;
	}

	// Turnstile anti-crawl: protect article paths from crawlers.
	// Cloudflare Turnstile decides whether to challenge based on risk.
	// Protected: /, /posts, /post/*, /tags, /tag/*, /about
	const isTsProtected = /^\/($|posts(\/|$)|post\/|tags(\/|$)|tag\/|about(\/|$))/.test(pn);
	// Exempt: login, rss, sitemap, robots, manifest, api, res, sw, favicon, config, ts-challenge
	const isTsExempt = /^\/(login|config|ts-challenge|rss|atom|api\/|sitemap\.xml|robots\.txt|manifest\.json|res\/|sw\.js|service-worker\.js|favicon)/.test(pn);
	if (isTsProtected && !isTsExempt && !isTsVerified(event.request, ip)) {
		// Mark abandon: start timers for matching abandon trigger rules
		const abandonTriggers = triggers.filter((t) => t.abandon && t.active && t.isInSchedule());
		if (abandonTriggers.length) {
			const r = { ip, path: pn, method: event.request.method.toLowerCase(), headers: event.request.headers };
			for (const rule of abandonTriggers) {
				const hr = hitRule(r, rule);
				if (hr) {
					markAbandon(ip, rule);
				}
			}
		}

		const cr = challengeResponse(event.url.href, isApi);
		log.status = cr.status;
		if (!isLocalhost && !isAuthenticated && (fr?.log || log.log)) {
			saveToDb(log);
		}
		ruv({
			ip: log.ip,
			path: log.path,
			ua: log.headers.get('user-agent') || '',
			status: cr.status
		});
		return cr;
	}

	// checkRedirect after firewall/triggers/turnstile, before handler
	if (!/^\/(api|res|font|src|manifest\.json)/.test(pn)) {
		const p = checkRedirect(sysStatue, pn, event.request);
		if (p) {
			log.status = 307;
			if (!isLocalhost && !isAuthenticated && (fr?.log || log.log)) {
				saveToDb(log);
			}
			ruv({
				ip: log.ip,
				path: log.path,
				ua: log.headers.get('user-agent') || '',
				status: 307
			});
			return new Response('', { status: 307, headers: new Headers({ location: p }) });
		}
	}

	res = await handle();
	log.status = res.status;
	res = triggersHit(sTr, log) || res;
	if (!isLocalhost && !isAuthenticated && (fr?.log || log.log)) {
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
	error(400);
};

// === IP Aggregation ===

let _aggTimer: ReturnType<typeof setTimeout> | undefined;
const AGG_INTERVAL = 1e3 * 3600 * 24; // 24 hours

function getIpOctets(ip: string): number[] | null {
	const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	if (!m) return null;
	return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), parseInt(m[4])];
}

function isCidr(ip: string): boolean {
	return /[\/-]/.test(ip);
}

function isCidr24(ip: string): boolean {
	return /\.0\/24$/.test(ip);
}

function isCidr16(ip: string): boolean {
	return /\.0\.0\/16$/.test(ip);
}

function toCidr24(octets: number[]): string {
	return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

function toCidr16(octets: number[]): string {
	return `${octets[0]}.${octets[1]}.0.0/16`;
}

export async function runAggregate(): Promise<void> {
	if (sys.fwAggregate === false || !blackList.length) return;

	const now = Date.now();
	const lastCount = sys.fwLastCount || 0;
	const currentCount = blackList.length;
	const newCount = currentCount - lastCount;

	// Skip if count unchanged or new IPs < 200
	if (lastCount > 0 && (newCount <= 0 || newCount < 200)) {
		sys.fwLastAggregateAt = now;
		return;
	}

	// Separate individual IPs from CIDRs
	const individualIps: BlackList[] = [];
	const cidr24s: BlackList[] = [];
	for (const b of blackList) {
		if (isCidr(b.ip)) {
			if (isCidr24(b.ip) && !isCidr16(b.ip)) cidr24s.push(b);
		} else {
			individualIps.push(b);
		}
	}

	// IDs of entries to remove from DB and memory
	const toRemoveIds = new Set<number>();
	// IPs to remove from CF (individual IPs that get aggregated)
	const ipsToRemoveFromCf: string[] = [];
	// New CIDR entries to add to DB, memory, and CF
	const cidrsToAdd: string[] = [];
	const marksForCidr = new Map<string, string>(); // CIDR -> aggregated marks

	// --- Phase 1: /24 aggregation ---
	const by24 = new Map<string, BlackList[]>();
	for (const b of individualIps) {
		const octets = getIpOctets(b.ip);
		if (!octets) continue;
		const prefix24 = `${octets[0]}.${octets[1]}.${octets[2]}`;
		let group = by24.get(prefix24);
		if (!group) { group = []; by24.set(prefix24, group); }
		group.push(b);
	}

	for (const [prefix24, group] of by24) {
		if (group.length > 5) {
			const octets = getIpOctets(group[0].ip);
			if (!octets) continue;
			const cidr = toCidr24(octets);
			if (!blackList.find((b) => b.ip === cidr)) {
				cidrsToAdd.push(cidr);
				const marks = [...new Set(group.map((b) => b.mark).filter((m) => m && m !== '-'))];
				if (marks.length) marksForCidr.set(cidr, marks.join(','));
			}
			for (const b of group) {
				toRemoveIds.add(b.id);
				ipsToRemoveFromCf.push(b.ip);
			}
		}
	}

	// --- Phase 2: /16 aggregation ---
	// Refresh cidr24s after phase 1 additions — but additions haven't been committed yet.
	// We work with the pre-existing cidr24s plus newly generated /24 CIDRs.
	const all24 = [...cidr24s];
	for (const cidr of cidrsToAdd) {
		if (isCidr24(cidr)) {
			// Create a synthetic BlackList-like entry for grouping
			all24.push({ ip: cidr, id: -1, mark: '', createAt: 0, respId: 0 } as BlackList);
		}
	}

	const by16 = new Map<string, (BlackList | { ip: string })[]>();
	for (const b of all24) {
		const octets = getIpOctets(b.ip.replace(/\.0\/24$/, '.1'));
		if (!octets) continue;
		const prefix16 = `${octets[0]}.${octets[1]}`;
		let group = by16.get(prefix16);
		if (!group) { group = []; by16.set(prefix16, group); }
		group.push(b);
	}

	for (const [prefix16, group] of by16) {
		if (group.length > 5) {
			const octets = getIpOctets(group[0].ip.replace(/\.0\/24$/, '.1'));
			if (!octets) continue;
			const cidr16 = toCidr16(octets);
			if (!blackList.find((b) => b.ip === cidr16) && !cidrsToAdd.includes(cidr16)) {
				cidrsToAdd.push(cidr16);
			}
			for (const b of group) {
				if ('id' in b && b.id > 0) {
					toRemoveIds.add(b.id);
				}
				// Remove the /24 CIDR from cidrsToAdd if it was added in phase 1
				const idx = cidrsToAdd.indexOf(b.ip);
				if (idx !== -1) {
					cidrsToAdd.splice(idx, 1);
					marksForCidr.delete(b.ip);
				}
				if (isCidr(b.ip)) ipsToRemoveFromCf.push(b.ip);
			}
		}
	}

	if (!toRemoveIds.size && !cidrsToAdd.length) {
		sys.fwLastCount = currentCount;
		sys.fwLastAggregateAt = now;
		return;
	}

	// --- Apply changes to DB and memory ---
	// Remove aggregated entries
	if (toRemoveIds.size) {
		delBlackList(...toRemoveIds);
	}

	// Add new CIDRs
	for (const cidr of cidrsToAdd) {
		const mark = marksForCidr.get(cidr) || 'aggregated';
		const b = model(BlackList, { ip: cidr, mark, respId: -1 }) as BlackList;
		db.save(b);
		blackList.push(b);
		const rule = b.toRule();
		cidrBlackRules.push(rule);
	}

	// --- CF sync ---
	if (sys.cfAccountId && sys.cfApiToken && sys.cfListId) {
		try {
			const cfMod = await import('$lib/server/cloudflare');

			// Remove aggregated IPs from CF
			if (ipsToRemoveFromCf.length) {
				const existing = await cfMod.getListItems(sys.cfListId);
				const ipToId = new Map<string, string>();
				for (const item of existing) {
					ipToId.set(item.ip, item.id);
				}
				const idsToRemove: string[] = [];
				for (const ip of ipsToRemoveFromCf) {
					const id = ipToId.get(ip);
					if (id) idsToRemove.push(id);
				}
				if (idsToRemove.length) {
					await cfMod.removeIpsFromList(sys.cfListId, idsToRemove);
				}
			}

			// Add new CIDRs to CF
			if (cidrsToAdd.length) {
				await cfMod.addIpsToList(sys.cfListId, cidrsToAdd, 'aggregated');
			}
		} catch (e) {
			console.error('[aggregate] CF sync error:', e);
		}
	}

	// Persist count
	sys.fwLastCount = blackList.length;
	sys.fwLastAggregateAt = now;
}

export function scheduleAggregate(): void {
	if (_aggTimer) clearTimeout(_aggTimer);
	if (sys.fwAggregate === false) return;
	// First run after 60s, then every 24h
	_aggTimer = setTimeout(() => {
		runAggregate().catch((e) => console.error('[aggregate] error:', e));
		// Re-schedule for next day
		_aggTimer = setInterval(() => {
			runAggregate().catch((e) => console.error('[aggregate] error:', e));
		}, AGG_INTERVAL);
	}, 60_000);
}

// === Test exports — accessible via import { __test } ===
export const __test = {
	hitRule,
	recordUaEntry,
	analyzeUaTrigger,
	runUaAnalysis,
	scheduleUaAnalysis,
	addBlackListRule,
	markAbandon,
	clearAbandon,
	getPendingAbandons: () => new Map(pendingAbandons),
	clearPendingAbandons: () => {
		for (const [, entries] of pendingAbandons) {
			for (const e of entries) clearTimeout(e.timer);
		}
		pendingAbandons.clear();
	},
	getUaMaxWindow: () => _uaMaxWindow,
	setUaMaxWindow: (w: number) => { _uaMaxWindow = w; },
	getUaEntries: () => uaEntries.slice(),
	clearUaEntries: () => { uaEntries.length = 0; },
	getWhiteList: () => (whiteList || []).slice(),
	clearWhiteList: () => {
		if (whiteList) whiteList.length = 0;
		else whiteList = [];
		exactWhiteIp.clear();
		cidrWhiteRules.length = 0;
	},
	getBlackList: () => (blackList || []).slice(),
	clearBlackList: () => {
		if (blackList) blackList.length = 0;
		else blackList = [];
		exactBlackIp.clear();
		cidrBlackRules.length = 0;
	},
	getTriggers: () => (triggers || []).slice(),
	setTriggers: (t: FWRule[]) => { triggers = t; },
	getRules: () => (rules || []).slice(),
	setRules: (r: FWRule[]) => { rules = r; },
};
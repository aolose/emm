import {
	body2query,
	decryptBuf,
	delay,
	encryptHeader,
	fetchOpt,
	getErr,
	getHeaderDataType,
	randNum,
	shareKey,
	syncShareKey,
	syncStatus
} from './utils';
import { dataType, method, reqMethod } from './enum';
import { browser } from '$app/environment';
import type {
	ApiName,
	cacheRecord,
	connectFn,
	MethodNumber,
	PromiseConnector,
	reqCache,
	reqData,
	reqOption,
	reqParams
} from './types';
import type { Load, LoadEvent } from '@sveltejs/kit';
import { hooks } from '$lib/apiHooks';
import { error, redirect } from '@sveltejs/kit';
import { confirm, status } from '$lib/store';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

const cacheData = '.d';
const cacheKey = '.k';
const cacheExpire = '.e';
const cacheGroup = '.g';
const cacheBegin = '.b';

let reqCacheMap: reqCache;
const cacheNames = [cacheData, cacheKey, cacheExpire, cacheBegin];
const reqPromiseCache = new Map<string, Promise<reqData>>();
const reqKey = (url: string, params: reqParams, method?: MethodNumber, key?: string | number) => {
	let rk = `${url}${method || 0}`;
	if (key) return `${rk}${key}`;
	if (params !== undefined) {
		const k = JSON.stringify(params).replace(/[,.^{}()\-_'"\\/?:]/gi, '');
		rk = `${url}_${k.length}_${Array.from(k).reduce((a, b) => a + b.charCodeAt(0), 0)}`;
	}
	return rk;
};
export const clearGroup = (groupKey: string) => {
	const s = group.get(groupKey);
	if (s && s.size) {
		group.delete(groupKey);
		for (const k of s) {
			reqCacheMap.delete(k);
		}
		saveCacheToStorage();
	}
};
const group = new Map<string, Set<string>>();
const saveCacheToStorage = () => {
	if (!browser) return;
	const d = [] as unknown[];
	const k = [] as string[];
	const e = [] as number[];
	const now = Date.now();
	const g = [];
	for (const [k, v] of group) {
		g.push(`${k}:${[...v].join()}`);
	}
	localStorage.setItem(cacheGroup, g.join(';'));
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
	const g = localStorage.getItem(cacheGroup);
	if (g) {
		g.split(';').forEach((a) => {
			const [k, v] = a.split(':');
			group.set(k, new Set(v.split(',')));
		});
	}
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
				} else {
					ch = 1;
					delGroupKey(ke[i]);
				}
			});
		} catch (e) {
			console.error(e);
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
const reqCache = (key: string, run: (re?: cacheRecord) => Promise<reqData>): Promise<reqData> => {
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

const getHooks = (url: string, method = 0) => {
	const hks = hooks[url] || {};
	const mh = reqMethod[method].toLowerCase() as keyof typeof hks;
	return hks[mh] || {};
};

const query = async (url: ApiName, params?: reqParams, cfg?: reqOption): Promise<reqData> => {
	const oriParams = typeof params === 'object' ? { ...params } : params;
	let uu = url as string;
	const { before, after, proxy } = getHooks(url, cfg?.method);
	// global hook
	if (before) {
		const b = before(params);
		if (b !== undefined) params = b;
	}
	if (cfg?.before) {
		const [b, u] = cfg.before(params, url, cfg?.ctx);
		if (b) params = b;
		if (u) uu = u;
	}

	const px = proxy || cfg?.proxy;
	if (px) {
		const res = await px(params, cfg);
		if (res) return res;
	}

	const enc = browser && cfg?.encrypt;

	if (cfg?.method === method.GET && params) {
		uu += `?${body2query(params)}`;
		params = undefined;
	}
	if (enc) await syncShareKey();
	const opt = {
		method: reqMethod[cfg?.method || 0],
		...(await fetchOpt(params, enc, cfg))
	};

	isLoadFn = !!cfg?.fetch;
	const ft = cfg?.fetch || fetch;

	return ft(`/api/${uu}`, opt).then(async (r) => {
		let fal = false;
		if (r.status >= 400) {
			if (r.status === 401) {
				let s = get(status);
				// read mode
				if (s === 2) s = await syncStatus();
				else s = 0;
				if (!s) {
					if (browser) {
						sessionStorage.setItem('bk', location.pathname);
						confirm('token expire!', '', 'ok').then(() => status.set(0));
					} else return redirect(307, '/login');
				}
			}
			fal = true;
			cfg = cfg || {};
			cfg.cache = 0;
		} else if (r.status > 300) {
			const lo = await r.headers.get('location');
			if (lo) return redirect(r.status as 301, lo);
		}
		const e = encryptHeader(r);
		const t = getHeaderDataType(r.headers);
		let ru;
		if (e) {
			const b = await r.arrayBuffer();
			const d = await decryptBuf(b, parseInt(e, 36), shareKey);
			switch (t) {
				case dataType.json:
					ru = d.json();
					break;
				case dataType.text:
					ru = d.text();
					break;
				default:
					ru = d.buffer();
			}
		} else {
			switch (t) {
				case dataType.json:
					ru = await r.json();
					break;
				case dataType.text:
					ru = await r.text();
					break;
				default:
					ru = await r.arrayBuffer();
			}
		}
		if (fal) {
			throw {
				status: r.status,
				data: await ru
			};
		}
		if (after) {
			const r = after(oriParams, ru);
			if (r) ru = r;
		}
		return ru;
	});
};
const addGroupKey = (groupKey: string, key: string) => {
	if (groupKey) {
		const s = group.get(groupKey) || new Set();
		s.add(key);
		group.set(groupKey, s);
	}
};
const delGroupKey = (key: string) => {
	for (const [k, v] of group) {
		if (v.has(key)) v.delete(key);
		if (!v.size) group.delete(k);
	}
};

export const saveCache = (
	url: ApiName,
	params: reqParams | reqData,
	data: reqData | number,
	cache?: number,
	method: MethodNumber = 1,
	groupKey?: string,
	customKey?: string
) => {
	if (!browser) return;
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
	const key = reqKey(url, p, method, customKey);
	if (groupKey) addGroupKey(groupKey, key);
	const now = Date.now();
	const r = [now + c, d, undefined] as cacheRecord;
	reqCacheMap.set(key, r);
	saveCacheToStorage();
};
const delayMap = new Map<string, [connectFn, (params?: reqParams) => void, boolean]>();
export const req = (url: ApiName, params?: reqParams, cfg?: reqOption) => {
	const done = cfg?.done;
	const dly = cfg?.delay;
	if (browser && dly) {
		const delayKey = reqKey(url, params, cfg?.method, cfg?.delayKey || cfg?.delay);
		const w = delayMap.get(delayKey);
		if (w) {
			if (w[2]) {
				// drop pending request
				w[0]();
				delayMap.delete(delayKey);
			} else {
				w[1](params);
				return new Promise(w[0]);
			}
		}
		const connect = {} as PromiseConnector;
		const connectFn: connectFn = (resolve, reject) => {
			connect.resolve = resolve;
			connect.reject = reject;
		};
		const cf = { ...(cfg || {}) };
		delete cf.delay;
		const delayReq = delay((params?: reqParams) => {
			const rec = delayMap.get(delayKey);
			if (!rec) return;
			rec[2] = true;
			req(url, params, cf)
				.then((a: reqData) => connect.resolve?.(a))
				.catch((e: reqData) => connect.reject?.(e))
				.finally(() => {
					// request finish
					// make reusable
					rec[2] = false;
				});
		}, dly);
		delayMap.set(delayKey, [connectFn, delayReq, false]);
		delayReq(params);
		return new Promise(connectFn);
	}
	const key = reqKey(url, params, cfg?.method, cfg?.key);
	if (cfg?.group) addGroupKey(cfg.group, key);
	let p = browser ? reqPromiseCache.get(key) : undefined;
	if (!p) {
		const cache = cfg?.cache;
		p = reqCache(cache ? key : '', async (rec) => {
			const d = await query(url, params, cfg);
			if (cache && rec) {
				rec[0] = Date.now() + cache;
				rec[1] = d;
				rec[2] = undefined;
				saveCacheToStorage();
			}
			return d;
		})
			.then(async (d) => {
				if (done) await done(d, cfg?.ctx);
				return d;
			})
			.catch((e) => {
				if (cfg?.fail) {
					cfg.fail(e.data, e.status, cfg?.ctx);
				} else throw e;
			})
			.finally(() => reqPromiseCache.delete(key));
		if (browser) {
			reqPromiseCache.set(key, p);
		}
	}
	return p;
};
export const api = (url: ApiName, cfg?: reqOption) => {
	const c = { ...(cfg || {}) };
	if (c.delay) c.delayKey = randNum().toString(36);
	return (params?: reqParams, cfg?: reqOption) => {
		return req(url, params, { ...c, ...cfg });
	};
};
export const apiLoad = (
	url: ApiName,
	params?: reqParams | ((event: LoadEvent, cfg: reqOption) => reqParams),
	cfg?: reqOption | ((event: LoadEvent) => reqOption)
): Load =>
	async function (event) {
		const { fetch, params: ps, url: u } = event;
		if (typeof cfg === 'function') cfg = cfg(event);
		(cfg = cfg || {}).fetch = fetch;
		cfg.ctx = { url: u };
		let pm: reqParams;
		if (params) {
			if (params) {
				if (typeof params === 'function') {
					pm = params(event, cfg);
				} else pm = params;
			}
		}
		return {
			p: ps,
			d: await req(url, pm, cfg).catch((e) => {
				if (e.status >= 400) {
					return error(e.status, getErr(e));
				}
				throw e;
			})
		};
	};

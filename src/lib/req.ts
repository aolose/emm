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

const CACHE_BUCKET = 'emm-data';

/** Write API response to Cache API. TTL stored as x-cache-ttl header (epoch ms). */
async function cacheApiPut(fullUrl: string, data: unknown, ttlMs: number) {
	const cache = await caches.open(CACHE_BUCKET);
	const res = new Response(JSON.stringify(data), {
		headers: { 'x-cache-ttl': String(Date.now() + ttlMs) }
	});
	await cache.put(fullUrl, res);
}

/** Read from Cache API by full URL. Returns {data,ttl} or null if absent/expired. */
async function cacheApiGet(fullUrl: string): Promise<{ data: unknown; ttl: number } | null> {
	const cache = await caches.open(CACHE_BUCKET);
	const res = await cache.match(fullUrl);
	if (!res) return null;
	const ttl = Number(res.headers.get('x-cache-ttl'));
	if (ttl && ttl < Date.now()) return null;
	const data = await res.json();
	return { data, ttl: ttl || Date.now() + 864e5 };
}

/** Delete all Cache API entries whose URL path starts with /api/{prefix}. */
async function cacheApiDeletePrefix(apiPrefix: string) {
	const cache = await caches.open(CACHE_BUCKET);
	const keys = await cache.keys();
	for (const req of keys) {
		if (new URL(req.url).pathname.startsWith(`/api/${apiPrefix}`)) {
			await cache.delete(req);
		}
	}
}

/** Warm the in-memory cache from Cache API (async, fire-and-forget at module load). */
async function loadFromCacheAPI() {
	if (!browser) return;
	const cache = await caches.open(CACHE_BUCKET);
	const keys = await cache.keys();
	for (const req of keys) {
		try {
			const res = await cache.match(req);
			if (!res) continue;
			const ttl = Number(res.headers.get('x-cache-ttl'));
			if (ttl && ttl < Date.now()) continue;
			const data = await res.json();
			const url = new URL(req.url);
			const path = url.pathname.replace(/^\/api\//, '');
			const params: Record<string, string> = {};
			url.searchParams.forEach((v, k) => { params[k] = v; });
			const rk = reqKey(
				path,
				Object.keys(params).length ? params : undefined,
				1 // method.GET
			);
			reqCacheMap.set(rk, [ttl || Date.now() + 864e5, data, undefined]);
		} catch {
			/* skip */
		}
	}
}
loadFromCacheAPI();

const reqCacheMap: reqCache = new Map();
const reqPromiseCache = new Map<string, Promise<reqData>>();
const reqKey = (url: string, params: reqParams, method?: MethodNumber, key?: string | number) => {
	let rk = `${url}${method || 0}`;
	if (key) return `${rk}${key}`;
	if (params !== undefined) {
		// Sort keys alphabetically so {a:1,b:2} and {b:2,a:1} produce the same key.
		const sorted: Record<string, unknown> = {};
		Object.keys(params as Record<string, unknown>)
			.sort()
			.forEach((k) => { sorted[k] = (params as Record<string, unknown>)[k]; });
		rk = `${rk}_${JSON.stringify(sorted)}`;
	}
	return rk;
};
const group = new Map<string, Set<string>>();
export const clearGroup = (groupKey: string) => {
	const s = group.get(groupKey);
	if (s && s.size) {
		group.delete(groupKey);
		for (const k of s) {
			reqCacheMap.delete(k);
		}
		cacheApiDeletePrefix(groupKey);
	}
};

let isLoadFn = false;
let hydrationDone = false;

/** Call once after SvelteKit hydration completes (root layout onMount).
 *  Before this point load functions never read cache, avoiding stale SSR data. */
export const markHydrationDone = () => (hydrationDone = true);

const allowReadCache = () => {
	if (isLoadFn && !hydrationDone) return false; // hydration: always fetch fresh
	return true;
};
const reqCache = (
	key: string,
	fullUrl: string | null,
	run: (re?: cacheRecord) => Promise<reqData>
): Promise<reqData> => {
	if (!key || !browser) return run();
	const rec = reqCacheMap.get(key);
	const now = Date.now();

	// L1: in-memory hit
	if (allowReadCache() && rec) {
		const [n, d, p] = rec;
		if (p) return p;
		if (n > now) return Promise.resolve(d);
		// Expired — evict from memory, fall through to L2/network.
		reqCacheMap.delete(key);
	}

	// L2: Cache API fallback (cold start, uses actual TTL from cached response).
	// Respect allowReadCache — skip during hydration to let SvelteKit's embedded fetch handle it.
	const tryCacheAPI = allowReadCache() && fullUrl
		? cacheApiGet(fullUrl).then((entry) => {
				if (entry !== null) {
					reqCacheMap.set(key, <[number, object | string | number | boolean | void | null, Promise<reqData> | undefined]>[entry.ttl, entry.data, undefined]);
					return entry.data;
				}
				return undefined;
			})
		: Promise.resolve(undefined);

	const r = [-1, undefined, undefined] as cacheRecord;
	reqCacheMap.set(key, r);

	r[2] = tryCacheAPI.then((cached) => {
		if (cached !== undefined) return cached;
		// L3: network
		return run(r);
	}).then(async (d) => {
		if (fullUrl) cacheApiPut(fullUrl, d, 864e5);
		return d;
	}).catch((err) => {
		if (rec && rec[1] !== undefined) {
			console.warn(`Network failed. Using stale cache.`, err);
			return rec[1];
		}
		throw err;
	});

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
			// Turnstile anti-crawl: API request blocked, redirect to challenge page
			if (r.status === 403 && browser) {
				try {
					const body = await r.clone().json();
					if (body?.tsChallenge && body?.challengeUrl) {
						window.location.href = body.challengeUrl;
						// Never resolve — the page will reload after verification
						return new Promise(() => {});
					}
				} catch {
					/* not JSON, ignore */
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
			if (r !== undefined) ru = r;
		}
		return ru;
	});
};

export const addGroupKey = (groupKey: string, key: string) => {
	const s = group.get(groupKey) || new Set<string>();
	s.add(key);
	group.set(groupKey, s);
};

export const saveCache = (
	url: string,
	p: reqParams,
	method: MethodNumber,
	d: reqData,
	customKey?: string,
	c=0,
	groupKey?: string
) => {
	if (!browser || !reqCacheMap) return;
	const key = reqKey(url, p, method, customKey);
	if (groupKey) addGroupKey(groupKey, key);
	const now = Date.now();
	const r = [now + c, d, undefined] as cacheRecord;
	reqCacheMap.set(key, r);
	// Also write to Cache API (SW shares this bucket)
	const fullUrl = `/api/${url}${p ? '?' + body2query(p as Record<string, unknown>) : ''}`;
	cacheApiPut(fullUrl, d, c);
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
		const fullUrl =
			cache && cfg?.method === method.GET
				? `/api/${url}${params ? '?' + body2query(params as Record<string, unknown>) : ''}`
				: null;
		p = reqCache(cache ? key : '', fullUrl, async (rec) => {
			const d = await query(url, params, cfg);
			if (cache && rec) {
				rec[0] = Date.now() + cache;
				rec[1] = d;
				rec[2] = undefined;
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

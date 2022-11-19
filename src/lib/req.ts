import {
	decryptBuf,
	fetchOpt,
	shareKey,
	encryptHeader,
	getHeaderDataType,
	syncShareKey
} from './utils';
import { dataType, reqMethod } from './enum';
import { browser } from '$app/environment';
import type { ApiName } from './types';
import type { PageLoad } from '../../.svelte-kit/types/src/routes/$types';

const cacheData = '.d';
const cacheKey = '.k';
const cacheExpire = '.e';
const cacheBegin = '.b';
type reqOption = {
	cache?: number;
	fetch?: typeof fetch;
	method?: 0 | 1 | 2 | 3;
	encrypt?: boolean;
	before?(data: unknown, url?: string): [unknown, string | undefined, Headers?];
};
type reqData = object | string | number | boolean | null | void;
type reqParams = object | string | number | undefined;
type cacheRecord = [number, reqData, Promise<reqData> | undefined];
type reqCacheMap = Map<string, cacheRecord>;
let reqCacheMap: reqCacheMap;
const cacheNames = [cacheData, cacheKey, cacheExpire, cacheBegin];
const reqKey = (url: string, params: reqParams) => {
	let key = url;
	if (params !== undefined)
		key =
			url +
			'_' +
			Array.from(JSON.stringify(params).replace(/[{}:,']/g, '')).reduce(
				(a, b) => a + b.charCodeAt(0),
				0
			);
	return key;
};

const saveCacheToStorage = () => {
	if (!browser) return;
	const d = [] as unknown[];
	const k = [] as string[];
	const e = [] as number[];
	const now = Date.now();

	localStorage.setItem(cacheBegin, now + '');
	for (const [a, [n, b, p]] of reqCacheMap) {
		const dur = n - now;
		if (!p && dur > 0) {
			k.push(a);
			d.push(b);
			e.push(dur);
		}
	}
	[d, k, e, now].forEach((a, i) => localStorage.setItem(cacheNames[i], JSON.stringify(a)));
};

const loadCacheFromStorage = () => {
	if (!reqCacheMap) reqCacheMap = new Map();
	if (!browser) return;
	let ch;
	const [d, k, e, b] = cacheNames.map((a) => localStorage.getItem(a));
	if (d && k && e && b) {
		try {
			const [da, ke, ex, bg] = [d, k, e, b].map((a) => JSON.parse(a));
			const n = Date.now();
			ex.forEach((a: number, i: number) => {
				const exp = a + bg;
				if (exp > n) {
					reqCacheMap.set(ke[i], [exp, da[i], undefined]);
				} else ch = 1;
			});
		} catch (e) {
			// ignore
		}
	}
	if (ch) saveCacheToStorage();
};

const reqCache = (
	url: string,
	params: reqParams,
	cache: number | undefined,
	run: (re?: cacheRecord) => Promise<reqData>
): Promise<reqData> => {
	const key = reqKey(url, params);
	if (!cache) {
		return run();
	}
	if (!browser) {
		return run();
	}
	loadCacheFromStorage();
	const rec = reqCacheMap.get(key);
	const now = Date.now();
	if (rec) {
		const [n, d, p] = rec;
		if (p) return p;
		if (n > now) return Promise.resolve(d);
	}
	const r = [-1, undefined, undefined] as cacheRecord;
	r[2] = run(r);
	reqCacheMap.set(key, r);
	return r[2];
};

const query = async (url: ApiName, params?: reqParams, cfg?: reqOption) => {
	let uu = url as string;
	if (cfg?.before) {
		const [b, u] = cfg.before(params, url);
		if (b) params = b;
		if (u) uu = u;
	}
	const enc = browser && cfg?.encrypt;
	if (enc) await syncShareKey();
	const opt = {
		method: reqMethod[cfg?.method || 0],
		...(await fetchOpt(params, enc))
	};
	const ft = cfg?.fetch || fetch;
	const fullUrl = `/api/${uu}`;
	return ft(fullUrl, opt).then(async (r) => {
		if (r.status >= 400) {
			cfg = cfg || {};
			cfg.cache = 0;
		}
		const e = encryptHeader(r);
		const t = getHeaderDataType(r.headers);
		if (e) {
			const b = await r.arrayBuffer();
			const d = await decryptBuf(b, parseInt(e, 36), shareKey);
			switch (t) {
				case dataType.json:
					return d.json();
				case dataType.text:
					return d.string();
			}
			return d.buffer();
		} else {
			switch (t) {
				case dataType.json:
					return r.json();
				case dataType.text:
					return r.text();
				case dataType.binary:
					return r.arrayBuffer();
			}
		}
	});
};

export const req = (url: ApiName, params?: reqParams, cfg?: reqOption) => {
	return reqCache(url, params, cfg?.cache, async (rec) => {
		const d = await query(url, params, cfg);
		if (cfg?.cache && rec) {
			rec[0] = Date.now() + cfg.cache;
			rec[1] = d;
			rec[2] = undefined;
			saveCacheToStorage();
		}
		return d;
	});
};

export const useApi = (url: ApiName, params?: reqParams, cfg?: reqOption): PageLoad =>
	async function ({ fetch }) {
		(cfg = cfg || {}).fetch = fetch;
		return await req(url, params, cfg);
	};

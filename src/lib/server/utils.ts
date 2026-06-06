import { NULL } from './enum';
import { contentType, dataType, encryptIv, encTypeIndex, geTypeIndex, permission } from '../enum';
import Pinyin from 'tiny-pinyin';
import type { Api, ApiData, ApiName, Class, Model, Obj } from '../types';
import apis from './api';
import {
	arrFilter,
	data2Buf,
	decryptReq,
	delay,
	diffObj,
	encrypt,
	encryptHeader,
	filter,
	getErr,
	getKINums,
	hasOwnProperty,
	parseBody,
	randNum
} from '../utils';
import { keyPool } from './crypto';
import { getPrimaryKey } from './model/decorations';
import { db, server, sys } from './index';
import fs from 'fs';
import { resolve, dirname } from 'path';
import type { RequestEvent } from '@sveltejs/kit';
import { clientMap } from '$lib/server/cache';
import { Client } from '$lib/server/client';
import type { TokenInfo } from '$lib/server/model';
import { writable, type Unsubscriber, type Writable } from 'svelte/store';
import type { Post } from '$lib/server/model';
import type { SQLQueryBindings } from 'bun:sqlite';

export const is_dev = process.env.NODE_ENV !== 'production';
export const sqlVal = (values: SQLQueryBindings[]) =>
	values.map((a) => {
		const t = typeof a;
		switch (t) {
			case 'boolean':
				return +(a as boolean);
			case 'object':
				if (a instanceof Date) return a.getTime();
		}
		return a;
	});

export function noNullKeyValues(o: Obj<Model>) {
	const C = o.constructor as Class<Model>;
	const ks = new Set<string>(Object.keys(new C() as object) as (keyof Model)[]);
	const keys = [] as string[];
	const values = [] as SQLQueryBindings[];
	const { TEXT, INT, DATE } = NULL;
	Object.entries(o).forEach(([k, v]) => {
		if (k[0] === '_' && !ks.has(k[0])) return;
		if (v !== undefined && v !== null) {
			const t = v.constructor.name;
			switch (t) {
				case 'Boolean':
					break;
				case 'String':
					if (v === TEXT) return;
					break;
				case 'Number':
					if (v === INT) return;
					break;
				case 'Date':
					if ((v as Date).getTime() === DATE.getTime()) return;
					break;
				default:
					return;
			}
		}
		if (v === undefined) v = null;
		keys.push(k);
		values.push(v);
	});
	return [keys, values];
}

function now() {
	return `[${new Date().toLocaleString()}]`;
}

type LogField = SQLQueryBindings | SQLQueryBindings[];
export const Log = {
	debug(label: string, ...params: LogField[]) {
		if (is_dev) console.log(now(), '\x1b[36m', label, '\x1b[0m', ...params);
	},
	warn(label: string, ...params: LogField[]) {
		console.warn(now(), label, ...params);
	},
	error(label: string, ...params: LogField[]) {
		console.error(now(), label, ...params);
	}
};

export const val = (a: unknown) => {
	if (a === undefined || a === null) return null;
	const t = a.constructor.name;
	switch (t) {
		case 'String':
			if (a === NULL.TEXT) return null;
			break;
		case 'Number':
			if (a === NULL.INT) return null;
			break;
		case 'Date':
			if (a === NULL.DATE) return null;
			break;
	}
	return a;
};

export const resp = (body: ApiData, code = 200, headers: { [key: string]: string } = {}) => {
	const [tp, data] = parseBody(body);
	if (code >= 400) {
		Log.debug('error', code, data as LogField);
	}
	return new Response(data as BodyInit, {
		status: code,
		headers: new Headers({
			[contentType]: tp,
			...headers
		})
	});
};

export const getShareKey = (req: Request) => {
	const enc = encryptHeader(req);
	if (enc) {
		const [num] = getKINums(enc);
		return keyPool.get(num)?.[0];
	}
};

export function slugGen(title: string) {
	return Pinyin.convertToPinyin(title, '', true)
		.replace(/ /g, '-')
		.replace(/[^0-9a-z!@#$&*()_\-+=~]+/gi, '-')
		.replace(/_+$/, '');
}

export const uniqSlug = (id: number, slug: string) => {
	const params: SQLQueryBindings[] = [`${slug}%`];
	let sql = `select slug
						 from post
						 where slug like ?`;
	if (id) {
		sql = `${sql} and id != ?`;
		params.push(id);
	}
	const slugs = db.db
		.prepare(sql)
		.all(...params)
		.map((a) => (a as Post).slug);
	if (slugs.length && slugs.includes(slug)) {
		const maxN = slugs
			.map((s) => {
				const suffix = s.slice(slug.length);
				if (!suffix) return 0;
				const m = suffix.match(/^-(\d+)$/);
				return m ? +m[1] : 0;
			})
			.reduce((a, b) => (a > b ? a : b), 0);
		return `${slug}-${maxN + 1}`;
	}
};

export const setNull = <T extends object>(o: T, key: string) => {
	(o as { [key: string]: unknown })[key] = null;
};

export const getReqJson = async (req: Request) => {
	const key = getShareKey(req);
	if (key) {
		const decrypted = await decryptReq(req, key, true);
		if (decrypted) {
			return decrypted.json();
		}
	}

	const ct = req.headers.get('content-type') || '';
	if (ct.includes('application/json')) return await req.json();
	return await req.json();
};

export const encryptResp = async (params: ApiData, keyNum: number, code = 200) => {
	const sk = keyPool.get(keyNum)?.[0];
	if (sk) {
		const [tp, data] = parseBody(params);
		if (data) {
			const num = randNum();
			const headers = new Headers({
				[contentType]: dataType.binary,
				[encTypeIndex]: geTypeIndex(tp),
				[encryptIv]: num.toString(36)
			});
			const bs = data2Buf(data);
			if (bs) {
				const buf = await encrypt(bs, num, sk);
				return new Response(buf, {
					status: code,
					headers
				});
			}
		}
	}
	return resp('', 500);
};
export const getIp = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(/ +/)[0];
export const apiHandle = async (event: RequestEvent): Promise<Response> => {
	const { request, params } = event;
	const name = params.api as ApiName;
	const m = request.method.toLowerCase() as keyof Api;
	const api = apis[name]?.[m];
	if (api) {
		const ip = event.locals.ip;
		request.headers.set('x-forwarded-for', ip);
		const r = await api(request);
		if (r !== undefined) {
			if (r instanceof Response) return r;
			const eh = encryptHeader(request);
			if (eh) {
				const [kNum] = getKINums(eh);
				return encryptResp(r, kNum);
			}
			return resp(r);
		}
		return resp('');
	}
	return resp('', 405);
};

const dBProxyErrs = new WeakMap<Model, Writable<Error | number>>();
export const throwDbProxyError = async <T extends Model>(o: T): Promise<T> => {
	const err = dBProxyErrs.get(o);
	let un: Unsubscriber | undefined;
	let t: ReturnType<typeof setTimeout> | undefined;
	if (err) {
		t = setTimeout(() => {
			err.set(0);
		}, 300);
	}
	try {
		return await new Promise<T>((r, fail) => {
			if (!err) {
				r(o);
			} else {
				err.set(-1);
				un = err.subscribe((n) => {
					if (n) {
						if (n instanceof Error) fail(n);
					} else r(o);
				});
			}
		});
	} finally {
		clearTimeout(t);
		if (un) un();
	}
};
export const DBProxy = <T extends Model>(C: Class<T>, init: Obj<T> = {}, load = true): T => {
	const error: Writable<Error | number> = writable(0);
	type key = keyof T;
	type value = T[key];
	const pk = getPrimaryKey(C.name) as keyof T;
	let o = model(C, init);
	let ori = {} as Obj<T>;
	let changes = {} as T;
	let create = false;
	const saveSync = () => {
		const p = diffObj(ori, { ...o, ...changes });
		if (!p) return;
		if (pk) p[pk] = o[pk];
		const ch = model(C, p);
		try {
			db.save(ch, { create });
			error.set(0);
		} catch (e) {
			console.error(e);
			error.set(e as Error);
			changes = {} as T;
			return;
		}
		create = false;
		ori = { ...Object.assign(o, changes, ch) };
		changes = {} as T;
	};
	const save = delay(saveSync, 100, 1000);
	if (load) {
		const k = o[pk];
		let u = 0;
		if (k) {
			const e = db.get(model(C, { [pk]: k }));
			if (e) {
				ori = { ...e };
				o = Object.assign(e, o);
				u = 1;
			} else create = true;
		}
		if (!u) {
			const r = db.get(o);
			if (r) {
				ori = { ...r };
				o = Object.assign(r, o);
			}
		}
		saveSync();
	}
	const px = new Proxy(o, {
		get(target, p: string, receiver: T) {
			if (p in changes) return Reflect.get(changes, p);
			const v = Reflect.get(target, p, receiver);
			return hasOwnProperty(target, p) ? val(v) : v;
		},
		set(target, p: string, newValue: value): boolean {
			changes[p as keyof T] = newValue;
			save();
			return true;
		}
	}) as T;
	dBProxyErrs.set(px, error);
	return px;
};

export const combineResult = (id: number, pk: ArrayBuffer) => {
	const bf = new Uint8Array(pk);
	const nbf = new Uint8Array(pk.byteLength + 2);
	nbf[0] = id >> 8;
	nbf[1] = id & 0xff;
	nbf.set(bf, 2);
	return nbf.buffer;
};

const countMap = new Map<string, number>();

export const model = <T extends Model>(M: Class<T> | FunctionConstructor, o: object = {}) => {
	const a = new M() as Obj<T>;
	const ks = new Set<keyof T>([...(Object.keys(o).filter((n) => n in a) as (keyof T)[])]);
	Object.keys(a).forEach((k) => {
		const o = k as keyof T;
		if (typeof a[o] !== 'function') delete a[o];
	});
	return Object.assign(a, filter(o, [...ks]));
};

export const md5 = (buf: Uint8Array | string) => {
	return Bun.CryptoHasher.hash('md5', buf, 'hex');
};

export const mkdir = (dir: string) => {
	dir = dir && resolve(dir);
	try {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		return '';
	} catch (e) {
		console.error(e);
		if (e instanceof Error) return getErr(e);
	}
};

export const saveFile = async (name: string | number, dir: string, buf: Uint8Array, key?: string, contentType = ''): Promise<boolean> => {
	// R2 upload path
	const { isR2Configured, r2Put } = await import('$lib/server/cloudflare');
	if (isR2Configured()) {
		const baseKey = key || String(name);
		const r2Key = dir === sys.thumbDir ? `_${baseKey}` : baseKey;
		const ct = contentType || (dir === sys.thumbDir ? 'image/webp' : '');
		const ok = await r2Put(r2Key, buf, ct);
		if (ok) return true; // uploaded to R2, skip local disk
		// fall through to local disk on failure
	}
	// Local disk path
	dir = dir && resolve(dir);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	const p = resolve(dir, name + '');
	fs.writeFileSync(p, buf, { flag: 'w' });
	return false;
};

const _delFile = (id: string | number, dir: string) => {
	dir = dir && resolve(dir);
	if (fs.existsSync(dir)) {
		try {
			fs.unlinkSync(resolve(dir, id + ''));
			return true;
		} catch (e) {
			console.log(e);
		}
	}
};
export const delFile = async (id: string | number, key?: string) => {
	const { isR2Configured, r2Delete } = await import('$lib/server/cloudflare');
	if (isR2Configured()) {
		const rk = key || String(id);
		await r2Delete(rk);
		await r2Delete(`_${rk}`);
		return;
	}
	if (_delFile(id, sys.uploadDir)) {
		_delFile(id, sys.thumbDir);
	}
};

const cacheCount = (model: Class<Model>, where?: SQLQueryBindings[]) => {
	const k = `${model.name}-${where?.join() || ''}`;
	const c = countMap.get(k);
	if (c !== null && c !== undefined) return c;
	else {
		const c = db.count(model, where);
		countMap.set(k, c);
		setTimeout(() => countMap.delete(k), 6e4); // cache 1min
		return c;
	}
};

export const pageBuilder = <T extends Model>(
	page: number,
	size: number,
	model: Class<T>,
	orders: string[] = [],
	keys: (keyof T)[] = [],
	where?: SQLQueryBindings[],
	after?: (a: T[]) => T[]
) => {
	const c = cacheCount(model, where) as number;
	return {
		total: Math.floor((c + size - 1) / size),
		items: arrFilter(db.page(model, page, size, orders, where, after), keys, false)
	};
};

export const hasKey = <T extends Model>(o: Obj<T>, key: string) => {
	const C = o.constructor as Class<T>;
	return Object.hasOwn(new C() as object, key);
};
export const setKey = <T extends Model>(o: Obj<T>, key: string, value: unknown) => {
	if (hasKey(o, key)) o[key as keyof T] = value as T[keyof T];
};

export let sysStatue = 0;
const isNotSet = (v: string | null | undefined) => !v || v === NULL.TEXT;

const chk = () => {
	const dbc = resolve('.dbCfg');
	let dbOk = false;
	if (fs.existsSync(dbc)) {
		const p = fs.readFileSync(dbc).toString();
		if (!p) return 0;
		const err = mkdir(dirname(p));
		if (err) {
			console.log(err);
			return 0;
		}
		const er = server.start(p);
		if (er) {
			return 0;
		} else dbOk = true;
	}
	if (!dbOk) return 0;
	if (isNotSet(sys?.admUsr) || isNotSet(sys?.admPwd)) return 1;
	if (isNotSet(sys?.uploadDir) || isNotSet(sys?.thumbDir)) return 2;
	if (sys?.ipLiteToken === null || isNotSet(sys?.ipLiteToken)) return 3;
	// Generate per-instance password salt if not present
	if (!sys.pwdSalt) {
		sys.pwdSalt = crypto.randomUUID();
	}
	return 9;
};
export const checkStatue = () => {
	sysStatue = chk();
	return sysStatue;
};

export const getClientAddr = (event: RequestEvent) => {
	return event.locals.ip;
};

export const getCookie = (req: Request, key: string) => {
	const c = req.headers.get('cookie');
	if (c) {
		return new Bun.CookieMap(c).get(key);
	}
};
const ckCfg: Bun.CookieInit = {
	httpOnly: true,
	sameSite: 'strict',
	path: '/'
};

export const delCookie = (resp: Response, key: string) => {
	resp.headers.append(
		'set-cookie',
		new Bun.Cookie(key, '', { ...ckCfg, expires: new Date(0) }).serialize()
	);
};

export const setCookie = (resp: Response, key: string, value: string, expires?: number) => {
	if (value === undefined) throw new Error('undefined cookie value!');
	const cf = { ...ckCfg };
	if (expires) cf.expires = new Date(expires);
	resp.headers.append('set-cookie', new Bun.Cookie(key, value, cf).serialize());
};

export const getClient = (req: Request) => {
	const c = getCookie(req, 'token');
	let cli;
	if (c) {
		cli = clientMap.get(c);
	}
	if (debugMode)
		if (!cli) {
			cli = new Client(true);
		}
	return cli;
};

export const expDay = (n: number) => Date.now() + n * 86400000;
export const setToken = (req: Request, resp: Response, token: TokenInfo) => {
	const client = getClient(req) || new Client();
	client.addToken(token);
	setCookie(resp, 'token', client.uuid, expDay(360));
};

export function checkRedirect(statue: number, path: string, req: Request) {
	let needLogin = false;
	const done = statue === 9;
	const login = '/login';
	const config = '/config';
	const isCfg = path === config;
	if (statue > 1 && !done) {
		const client = getClient(req);
		needLogin = !client?.ok(permission.Read);
	}
	if (needLogin && !debugMode) {
		if (isCfg || /^\/admin(\/|$)/i.test(path)) return login;
		return '';
	}
	// /admin.php, /admin.aspx, etc. — bot probes, let SvelteKit 404 them
	if (/^\/admin\./i.test(path)) return '';
	if (!done && !isCfg) {
		return config;
	} else if (done && isCfg) {
		return '/';
	}
	return '';
}

export const debugMode = 0;
export const sqlFields = (n: number) => ',?'.repeat(n).slice(1);

export const mv = (from: string, to: string) => {
	from = from && resolve(from);
	to = to && resolve(to);
	if (from === to) return;
	let mv = 0;
	let err;
	if (from) {
		err = mkdir(from);
		mv++;
	}
	if (!err) {
		if (to) err = mkdir(to);
		mv++;
	}
	if (!err && mv === 2) {
		try {
			if (fs.existsSync(to)) {
				fs.rmSync(to, { recursive: true, force: true });
			}
			fs.renameSync(from, to);
		} catch (e) {
			console.error(e);
			if (e instanceof Error) {
				err = getErr(e);
			}
		}
	}
	return err;
};

export const blogExp = async () => {
	const dbc = '.dbCfg';
	const dbpath = await Bun.file(dbc).text();

	const entries: Record<string, string | Uint8Array> = {};
	entries[dbc] = dbpath;
	entries['d.gz'] = Bun.gzipSync(new Uint8Array(db.db.serialize()));

	const addDirEntries = (dir: string, prefix: string) => {
		const p = resolve(dir);
		if (fs.existsSync(p)) {
			for (const f of fs.readdirSync(p, { recursive: true }) as string[]) {
				const fp = resolve(p, f);
				if (fs.statSync(fp).isFile()) {
					entries[prefix + '/' + f] = new Uint8Array(fs.readFileSync(fp));
				}
			}
		}
	};
	addDirEntries(sys.uploadDir, 'u');
	addDirEntries(sys.thumbDir, 't');

	const zip = new Bun.Archive(entries);
	return zip.bytes();
};

export const printSql = (sql: string, value: unknown[]) => {
	let i = 0;
	return is_dev ? sql.replace(/\?/g, () => `${value[i++]}`) : '';
};

type Entry = { filename: string; read: () => Promise<Uint8Array> };

import { unzipSync } from 'fflate';

export const unArchive = async (bytes: Uint8Array) => {
	const archive = new Bun.Archive(bytes);
	const filesMap = await archive.files();
	const files: Entry[] = [];
	for (const [filename, file] of filesMap) {
		files.push({
			filename,
			read: async () => new Uint8Array(await file.arrayBuffer())
		});
	}
	return files;
};

export const unZip = async (bytes: Uint8Array) => {
	const decompressed = unzipSync(bytes);
	const files: Entry[] = [];
	for (const [filename, data] of Object.entries(decompressed)) {
		files.push({
			filename,
			read: async () => data
		});
	}
	return files;
};

export const saveEntry = async (entry: Entry, rename: string) => {
	const filename = resolve(rename || entry.filename);
	mkdir(dirname(filename));
	const bytes = await entry.read();
	await Bun.write(filename, bytes);
};

export const findEntry = (files: Entry[], f: string) => files.find((a) => a.filename === f);

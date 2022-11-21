import { NULL } from './enum';
import { contentType, dataType, encryptIv, encTypeIndex, geTypeIndex } from '../enum';
import type { ApiData, ApiName } from '../types';
import * as apis from './api';
import {
	encrypt,
	parseBody,
	randNum,
	decryptReq,
	encryptHeader,
	getKINums,
	data2Buf,
	delay,
	hasOwnProperty
} from '../utils';
import { keyPool } from './crypto';
import type { Api } from '../types';
import type { Model } from '../types';
import { getPrimaryKey } from './model/decorations';
import { db } from './index';

export const is_dev = process.env.NODE_ENV !== 'production';

export const sqlVal = (values: unknown[]) =>
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

export function noNullKeyValues(o: object) {
	const keys = [] as string[];
	const values = [] as unknown[];
	const { TEXT, INT, DATE } = NULL;
	Object.entries(o).forEach(([k, v]) => {
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
					if (v.getTime() === DATE.getTime()) return;
					break;
				default:
					return;
			}
			keys.push(k);
			values.push(v);
		}
	});
	return [keys, values];
}

function now() {
	return `[${new Date().toLocaleString()}]`;
}

export const Log = {
	debug(label: string, ...params: unknown[]) {
		if (is_dev) console.log(now(), label, ...params);
	},
	info(label: string, ...params: unknown[]) {
		console.log(now(), label, ...params);
	},
	warn(label: string, ...params: unknown[]) {
		console.warn(now(), label, ...params);
	},
	error(label: string, ...params: unknown[]) {
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

export const resp = (body: ApiData, code = 200) => {
	const [tp, data] = parseBody(body);
	return new Response(data as BodyInit, {
		status: code,
		headers: new Headers({
			[contentType]: tp
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

export const getReqJson = async (req: Request) => {
	const shareKey = getShareKey(req);
	const decBuf = shareKey && (await decryptReq(req, shareKey, true));
	if (decBuf) return decBuf.json();
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
	return resp('', 403);
};

export const apiHandle = async (request: Request, name: ApiName): Promise<Response> => {
	const m = request.method.toLowerCase() as keyof Api;
	const api = apis[name]?.[m];
	if (api) {
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
	return resp('', 404);
};

interface Obj {
	[key: string]: unknown;
}

type mk = keyof Model;
export const DBProxy = <T extends Model>(o: Model, sync = true): T => {
	let e: Map<string, unknown>;
	const pk = getPrimaryKey(o);
	const ch = new Map<mk, unknown>();
	const save = delay(() => {
		if (ch.size > 0) {
			let c = 0;
			const n: Obj = { [pk]: o[pk] };
			n.constructor = o.constructor;
			for (const [k, v] of ch) {
				if (e.get(k) !== v) {
					c = 1;
					n[k] = v;
					e.set(k, v);
					ch.delete(k);
				}
				ch.delete(k);
			}
			if (c) {
				const { changes, lastInsertRowid: rowid } = db.save(n);
				if (changes && pk) {
					const b = db.db
						.prepare(`select ${pk} from ${o.constructor.name} where rowid=?`)
						.get(rowid) as Model;
					n[pk] = b[pk];
					e.set(pk, b[pk]);
				}
			}
		}
	}, 10);
	if (sync) {
		if (pk && o[pk] !== undefined) {
			const no = { [pk]: o[pk] };
			no.constructor = o.constructor;
			Object.assign(o, db.get(no));
			e = new Map(Object.entries(o));
		}
	}

	return new Proxy(o, {
		get(target: Model, p: string, receiver: unknown) {
			const v = Reflect.get(target, p, receiver);
			return hasOwnProperty(target, p) ? val(v) : v;
		},
		set(target: Model, p: mk, newValue: unknown, receiver: unknown): boolean {
			if (sync && hasOwnProperty(target, p)) {
				ch.set(p as mk, newValue);
				save();
			}
			return Reflect.set(target, p, newValue, receiver);
		}
	}) as T;
};

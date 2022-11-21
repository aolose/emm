import { req } from './req';
import { contentType, dataType, encryptIv, encTypeIndex, getIndexType } from './enum';
import type { RequestEvent } from '@sveltejs/kit';
import type { ApiData, ApiBodyData } from './types';

const { subtle } = crypto;
let genKey: CryptoKeyPair;
export let shareKey: CryptoKey | undefined;
export let keyNum: number;
export const maxKeyNum = 0xffff;
export const padNum = maxKeyNum.toString(36).length;
export const algorithm = {
	name: 'ECDH',
	namedCurve: 'P-256'
};
const algorithm_AES_CBC = {
	name: 'AES-CBC',
	length: 256
};

export async function splitResult(buf: unknown) {
	if (buf instanceof ArrayBuffer) {
		const a = new Uint8Array(buf);
		const b = a.slice(0, 2);
		const c = a.slice(2);
		keyNum = (b[0] << 8) + b[1];
		const srvPuk = await subtle.importKey('raw', c.buffer, algorithm, true, []);
		shareKey = await genShareKey(srvPuk, genKey.privateKey);
		shareExpire = Date.now() + shareKeyExpire;
		saveKey().then();
	}
}

export const encrypt = async (data: BufferSource, num: number, shareKey: CryptoKey) =>
	await subtle.encrypt(algorithm_AES_CBC_Gen(num), shareKey, data);

export const genPubKey = async () => {
	const { subtle } = crypto;
	genKey = await subtle.generateKey(algorithm, false, ['deriveKey']);
	return await subtle.exportKey('raw', genKey.publicKey);
};

export const decryptBuf = async (buf: ArrayBuffer, encrypt: number, key?: CryptoKey) => {
	let raw = buf;
	if (encrypt && key) raw = await subtle.decrypt(algorithm_AES_CBC_Gen(encrypt), key, buf);
	const txt = buf2Str(raw);
	return {
		json() {
			return JSON.parse(txt);
		},
		text() {
			return txt;
		},
		buffer() {
			return buf;
		}
	};
};

const shareKeyUsage = ['encrypt', 'decrypt'] as KeyUsage[];
export const genShareKey = async (pub: CryptoKey, pri: CryptoKey) => {
	return await subtle.deriveKey(
		{
			...algorithm,
			public: pub
		},
		pri,
		algorithm_AES_CBC,
		true,
		shareKeyUsage
	);
};

export const shareKeyExpire = 1e3 * 20;
const skName = 'sk';
let shareExpire = 0;
const loadKey = async () => {
	const n = Date.now();
	if (shareKey && shareExpire > n) return;
	else shareKey = undefined;
	try {
		const [k, exp, pr] = (sessionStorage.getItem(skName) || '').split(',');
		if (+exp > n) {
			const buf = data2Buf(pr);
			if (buf) {
				shareKey = await subtle.importKey('raw', buf, algorithm_AES_CBC, true, shareKeyUsage);
				keyNum = +k;
			}
		}
	} catch (e) {
		// ignore
	}
};

const saveKey = async () => {
	if (shareKey) {
		const buf = await subtle.exportKey('raw', shareKey);
		sessionStorage.setItem(skName, [keyNum, shareExpire, buf2Str(buf)].join());
	}
};

export const syncShareKey = async () => {
	await loadKey();
	if (shareKey) return;
	const pub = await genPubKey();
	const r = await req('hello', pub);
	await splitResult(r);
};

export function auth(event: RequestEvent): Response | void {
	// todo
}

export const combineResult = (id: number, pk: ArrayBuffer) => {
	const bf = new Uint8Array(pk);
	const nbf = new Uint8Array(pk.byteLength + 2);
	nbf[0] = id >> 8;
	nbf[1] = id & 0xff;
	nbf.set(bf, 2);
	return nbf.buffer;
};

export const getKINums = (ehd: string) => {
	return [parseInt(ehd.slice(0, padNum), 36) - maxKeyNum, parseInt(ehd.slice(padNum), 36)];
};

export const decryptReq = async (req: Request, shareKey: CryptoKey, server: boolean) => {
	const ehd = encryptHeader(req);
	if (ehd) {
		let viNum: number;
		if (!server) {
			viNum = parseInt(ehd, 36);
		} else {
			const ki = getKINums(ehd);
			viNum = ki[1];
		}
		if (shareKey) {
			const buf = await req.arrayBuffer();
			return await decryptBuf(buf, viNum, shareKey);
		}
	}
};

export const getHeaderDataType = (h: Headers) => {
	let t = h.get(contentType);
	if (h.has(encryptIv)) {
		t = getIndexType(h.get(encTypeIndex));
	}
	return t?.replace(/;.*/, '');
};

export const parseBody = (data: ApiData) => {
	const t = typeof data;
	let tp = dataType.text;
	switch (t) {
		case 'boolean':
		case 'number':
			tp = dataType.json;
			break;
		case 'object':
			if (data) {
				if (/ArrayBuffer|Blob|File|(Uint16|Uint8)Array/g.test(data.constructor.name))
					tp = dataType.binary;
				else {
					data = JSON.stringify(data);
					tp = dataType.json;
				}
			}
	}
	return [tp, data] as [string, ApiBodyData];
};

export const buf2Str = (buf: ArrayBuffer) => {
	const bv = new Uint16Array(buf);
	let n = bv.length;
	let s = '';
	while (n--) s = String.fromCharCode(bv[n]) + s;
	return s;
};

export const buf2Num = (buf: ArrayBuffer) => {
	const bv = new Uint8Array(buf);
	return bv.reduce((a, b, c) => {
		return a + (b << (8 * c));
	}, 0);
};

export const data2Buf = (data: ApiBodyData): ArrayBuffer | undefined => {
	if (data !== undefined) {
		const name = data.constructor.name;
		if (name === 'ArrayBuffer') return data as ArrayBuffer;
		if (name === 'Number') {
			let n = data as number;
			const a = [n & 0xff];
			while (n >= 0xff) a.push((n = n >>> 8) & 0xff);
			return new Uint8Array(a).buffer;
		}
		if (name === 'String') {
			const d = data as string;
			let n = d.length;
			const buf = new ArrayBuffer(n * 2);
			const bfv = new Uint16Array(buf);
			while (n--) {
				bfv[n] = d.charCodeAt(n);
			}
			return buf;
		}
	}
};

export const randNum = () => Math.floor(Date.now() * Math.random());

export const fetchOpt = async (o?: object | string | number, encrypted = false) => {
	const headers = new Headers();
	const num = randNum();
	let [tp, data] = parseBody(o);
	if (encrypted && data !== undefined) {
		tp = dataType.binary;
		headers.set(encryptIv, (maxKeyNum + keyNum).toString(36) + num.toString(36));
		const buf = data2Buf(data);
		if (buf) data = shareKey && (await encrypt(buf, num, shareKey));
	}
	headers.set(contentType, tp);

	return {
		body: data as BodyInit,
		headers
	};
};

export const ivGen = (num: number) => {
	let n = 16;
	const a = new Uint8Array(n);
	while (n--) {
		a[n] = Math.floor((0xffff * Math.abs(Math.cos(((num / (n + 1)) % Math.PI) / Math.PI))) & 0xff);
	}
	return a.buffer;
};

const algorithm_AES_CBC_Gen = (n: number) => {
	return {
		...algorithm_AES_CBC,
		iv: ivGen(n)
	};
};

export const encryptHeader = (req: { headers: Headers }) => req.headers.get(encryptIv);

export const hasOwnProperty = (target: object, p: string) =>
	Object.prototype.hasOwnProperty.call(target, p);

export const delay = (fn: () => void, ms = 0) => {
	let timer: ReturnType<typeof setTimeout>;
	return () => {
		clearTimeout(timer);
		timer = setTimeout(fn, ms);
	};
};

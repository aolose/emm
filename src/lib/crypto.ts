import type { ApiBodyData } from './types';

const { subtle } = crypto;

// ---- Per-instance password salt ----
let _pwdSalt = '';
export const setPwdSalt = (salt: string) => {
	_pwdSalt = salt;
};

// ---- Buffer encoding helpers ----

export const buf2Str = (buf: ArrayBuffer) => {
	const bv = new Uint16Array(buf);
	let n = bv.length;
	let s = '';
	while (n--) s = String.fromCharCode(bv[n]) + s;
	return s;
};

const buf2x = (buf: ArrayBuffer) => {
	const bv = new Uint8Array(buf);
	let n = bv.length;
	let s = '';
	const k =
		'1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+=!@#$%^&*<>?:_-|~(){}[],.';
	const t = k.length;
	while (n) {
		const v = [0, 0, 0, 0];
		let x = 4;
		while (x && n) {
			v[--x] = bv[--n];
		}
		let m = v[3] + (v[2] << 8) + (v[1] << 16) + ((v[0] << 24) >>> 0);
		while (m >= t) {
			const l = m % t;
			s += k[l];
			m = (m - l) / t;
		}
		s += k[m];
	}
	return s;
};

export const buf2Num = (buf: ArrayBuffer) => {
	const bv = new Uint8Array(buf);
	return bv.reduce((a, b, c) => a + (b << (8 * c)), 0);
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

// ---- Random helpers ----

export const randNum = (n?: number) => Math.floor(Date.now() * ((n || 0) + Math.random()));

export const randStr = (str: string) => {
	const m = str.length;
	let l = m;
	let w = '';
	const s = new Set();
	while (l--) {
		let a = Math.floor(Math.random() * m);
		while (s.has(a)) a = (a + 1) % m;
		s.add(a);
		w += str[a];
	}
	return w;
};

// ---- IV generator ----

export const ivGen = (num: number) => {
	let n = 16;
	const a = new Uint8Array(n);
	while (n--) {
		a[n] = Math.floor((0xffff * Math.abs(Math.cos(((num / (n + 1)) % Math.PI) / Math.PI))) & 0xff);
	}
	return a.buffer;
};

// ---- Password hashing ----

export async function enc(str: string) {
	const LEGACY_SALT = '2321aSDWas!@#$';
	const vi = _pwdSalt || LEGACY_SALT;
	const algo = _pwdSalt ? 'SHA-512' : 'SHA-256';
	const d = data2Buf(str + vi) || new Uint8Array([]);
	return buf2x(await subtle.digest(algo, d));
}

export async function legacyEnc(str: string) {
	const LEGACY_SALT = '2321aSDWas!@#$';
	const d = data2Buf(str + LEGACY_SALT) || new Uint8Array([]);
	return buf2x(await subtle.digest('SHA-256', d));
}

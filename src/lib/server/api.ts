import type { Api } from '../types';
import { sys } from './index';
import { genPubKey } from './crypto';
import { getReqJson, combineResult } from './utils';
import type { RespHandle } from '$lib/types';
import fs from 'fs';
import path from 'path';

const auth = (fn: RespHandle) => (req: Request) => {
	console.log('auth...');
	return fn(req);
};

export const initialized: Api = {
	get() {
		return +!!sys.admUsr;
	}
};

export const up: Api = {
	post: auth(async (req) => {
		const d = await req.formData();
		const f = d.get('file') as Blob;
		const n = d.get('name');
		// todo  file path
		// todo save to db
		fs.writeFileSync(path.resolve(`/${n}`), new Uint8Array(await f.arrayBuffer()));
	})
};

export const hello: Api = {
	async post(request) {
		const buf = await request.arrayBuffer();
		const [id, pk] = await genPubKey(buf);
		return combineResult(id, pk);
	}
};

export const setAdmin: Api = {
	async post(req) {
		const d = await getReqJson(req);
		sys.admUsr = d['usr'];
		sys.admPwd = d['pwd'];
		return sys;
	}
};

export const test: Api = {
	get() {
		return {
			test: 1
		};
	}
};

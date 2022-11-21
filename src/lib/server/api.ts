import type { Api } from '../types';
import { sys } from './index';
import { genPubKey } from './crypto';
import { combineResult } from '../utils';
import { getReqJson } from './utils';

export const initialized: Api = {
	get() {
		return +!!sys.admUsr;
	}
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

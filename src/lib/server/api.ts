import type { Api } from '../types';
import { sys } from './index';
import { genPubKey } from './crypto';
import { combineResult } from '../utils';
import { getReqJson, resp, val } from './utils';

export const hello: Api = {
	async post(request) {
		const buf = await request.arrayBuffer();
		const [id, pk] = await genPubKey(buf);
		return combineResult(id, pk);
	}
};

export const setAdmin: Api = {
	async post(req) {
		if (!val(sys.admUsr)) {
			const d = await getReqJson(req);
			sys.admUsr = d['usr'];
			sys.admPwd = d['pwd'];
			return sys;
		} else {
			return resp('admin already exist!', 403);
		}
	}
};

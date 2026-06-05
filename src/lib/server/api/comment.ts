import type { APIRoutes } from '../../types';
import { sys } from '../index';
import { resp } from '../utils';
import { auth } from './_common';
import { permission } from '$lib/enum';
import { cmManager } from '$lib/server/comment';

const { Admin, Read } = permission;

const apis: APIRoutes = {
	alCm: {
		get: auth(Read, () => `${+sys?.comment || 0}${+sys?.cmCheck}`),
		post: auth(Admin, async (req) => {
			const a = await req.text();
			sys.comment = +a[0];
			sys.cmCheck = +a[1];
		})
	},
	cmLs: { get: cmManager.list },
	cm: { get: cmManager.get, post: cmManager.set, delete: cmManager.del }
};

export default apis;

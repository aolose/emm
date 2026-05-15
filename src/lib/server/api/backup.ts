import type { APIRoutes } from '../../types';
import { resp } from '../utils';
import { auth } from './_common';
import { permission } from '$lib/enum';
import { blogExp } from '../utils';
import { restore } from '$lib/server/restore';
import { contentType, dataType } from '$lib/enum';
import { getClient } from '../utils';
import { sysStatue } from '../utils';

const { Admin } = permission;

const apis: APIRoutes = {
	backup: {
		post: async (req) => {
			if (sysStatue >= 1 && !getClient(req)?.ok(Admin)) return resp('no permission', 401);
			const data = await req.arrayBuffer();
			return await restore(data);
		},
		get: auth(Admin, async () => {
			const f = await blogExp();
			return new Response(f, { status: 200, headers: new Headers({
				'content-disposition': `attachment; filename=blog_${Date.now()}.tar`,
				[contentType]: dataType.binary }) });
		})
	},
};

export default apis;

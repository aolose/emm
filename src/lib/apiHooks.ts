import type { apiHooks, Obj } from '$lib/types';
import type { Post, Tag, Comment } from '$lib/server/model';
import { modelArr2Str } from '$lib/utils';

/**
 * add global hook for browser side requests
 */
export const hooks: apiHooks = {
	tag: {
		post: {
			before: (o) => modelArr2Str(o as Tag, '_posts')
		}
	},
	post: {
		post: {
			before: (v) => {
				const o = v as Post & { _?: number };
				if (o.id && o._) delete o._;
				return modelArr2Str(o, '_reqs');
			}
		}
	},
	cm: {
		post: {
			before: (v) => {
				const o = v as Obj<Comment>;
				if (o.topic === o.reply) delete o.reply;
			}
		}
	},
	cmLs: {
		get: {
			before: (p) => {
				const o = p as { status?: number };
				if (o.status === -1) {
					delete o.status;
				}
				return o;
			}
		}
	}
};

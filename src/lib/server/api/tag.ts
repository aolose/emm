import type { APIRoutes } from '../../types';
import { db } from '../index';
import { getClient, getReqJson, model, resp, sqlFields, throwDbProxyError } from '../utils';
import { filter } from '$lib/utils';
import { Post, Tag } from '$lib/server/model';
import { auth } from './_common';
import { permission } from '$lib/enum';
import { tagPatcher, tags } from '$lib/server/store';
import { get } from 'svelte/store';
import { tagPostCache, getPubTags } from '$lib/server/cache';
import { versionStrPatch } from '$lib/setStrPatchFn';
import { DBProxy } from '../utils';

const { Admin, Read } = permission;

const apis: APIRoutes = {
	tagLS: {
		post: auth(Read, async () => {
			const ts = get(tags);
			return ts.map((t) => {
				const ps = tagPostCache.getPostIds(t.id);
				if (ps.length) {
					return {
						...t,
						_posts: db
							.all(model(Post), `id in (${sqlFields(ps.length)})`, ...ps)
							.map((a) => ({ id: a.id, title: a.title || a.title }))
					};
				}
				return filter(t, [], false);
			});
		})
	},
	tag: {
		post: auth(Admin, async (req) => {
			const ts = get(tags);
			let t: Tag | undefined;
			const tag = (await req.json()) as Tag;
			if (tag.id) {
				t = ts.find((a) => a.id === tag.id);
			}
			const { _posts } = tag;
			try {
				if (t) {
					await throwDbProxyError(Object.assign(t, filter(tag, ['banner', 'desc', 'name'], false)));
				} else ts.unshift(await throwDbProxyError((t = DBProxy(Tag, tag))));
			} catch (e) {
				if (e instanceof Error) {
					let msg = e.message;
					if (msg.includes('UNIQUE constraint')) msg = 'tag name exist';
					return resp(msg, 500);
				}
			}
			if (t && typeof _posts === 'string') {
				const ids = _posts
					.split(',')
					.map((a) => +a)
					.filter((a) => a);
				tagPostCache.setPosts(t.id, ids);
			}
			tags.set([...ts]);
		}),
		delete: auth(Admin, async (req) => {
			const id = +(await req.text());
			if (!id) return;
			const t = get(tags).find((t) => t.id === id);
			if (t) {
				tagPostCache.delete([], t.id);
				db.del(t);
				tags.update((tt) => tt.filter((a) => a.id !== id));
			}
		})
	},
	tags: {
		get: async (req) => {
			return getPubTags(getClient(req))
				.map((a) => a.name)
				.join();
		},
		post: auth(Read, async (req) => {
			const ver = +(await req.text());
			const r = tagPatcher(ver);
			return versionStrPatch(r);
		})
	}
};

export default apis;

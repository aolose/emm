import type { APIRoutes, curPost, Obj } from '../../types';
import { db, sys } from '../index';
import { getClient, getReqJson, model, pageBuilder, resp, sqlFields } from '../utils';
import { diffObj, filter, clipWords, getPain, trim } from '$lib/utils';
import { contentType, dataType, permission } from '$lib/enum';
import { NULL } from '$lib/server/enum';
import { Post, PostRead } from '$lib/server/model';
import { auth, REQS_PAGE_SIZE, POSTS_DEFAULT_SIZE, VISITOR_PAGE_SIZE, buildSearchWhere, withDraftLock } from './_common';
import { noAccessPosts, getPostSibling, patchPostTags, reqPostCache, readManager } from '$lib/server/cache';
import { postList, postPatch, pubPostList } from '$lib/server/posts';
import { getRuv } from '$lib/server/puv';
import { ipInfoStr } from '$lib/server/ipLite';
import type { SQLQueryBindings } from 'bun:sqlite';

const { Read, Admin, Post: PostPerm } = permission;

const apis: APIRoutes = {
	reqs: {
		post: async (req) => {
			let ids: number[] = [];
			let m = new Map<number, number>();
			const page = +((await req.text()) || 0);
			if (debugMode) {
				ids = noAccessPosts() || [];
			} else {
				const cli = getClient(req);
				if (cli) {
					const c = cli.getReqs();
					if (c) {
						const rq = reqPostCache.get({ reqId: [...c.keys()] });
						m = new Map();
						ids = [];
						rq.forEach((q) => {
							ids.push(q.targetId);
							m.set(q.targetId, c.get(q.reqId) || -1);
						});
					}
				}
			}
			if (ids.length)
				return pageBuilder(page, REQS_PAGE_SIZE, Post, ['createAt desc'], ['title', 'slug', '_p'],
					[`id in (${sqlFields(ids.length)})`, ...ids],
					(arr) => { arr.forEach((a) => { a._p = +(m.get(a.id) || -1); }); return arr; });
		}
	},
	posts: {
		get: async (req) => {
			const params = new URL(req.url).searchParams;
			const page = +(params.get('page') || 1);
			const size = +(params.get('size') || POSTS_DEFAULT_SIZE);
			const tag = decodeURI(params.get('tag') || '');
			const tagInfo = !!params.get('inf');
			const skips = noAccessPosts(getClient(req));
			return await pubPostList(page, size, tag, skips, tagInfo);
		},
		post: auth(Read, async (req) => {
			const d = await req.json();
			const { page, size, ft = 1 } = d;
			const w: string[] = [];
			const v: SQLQueryBindings[] = [];
			if (!getClient(req)?.ok(Admin)) { w.push('published=?'); v.push(1); }
			const where = buildSearchWhere(d.sc || '', { ft, w, v });
			return postList(page, size, where);
		})
	},
	slug: {
		post: auth(Admin, async (req) => {
			const s = await req.text();
			const mt = s.match(/(\d*?),(.*)/);
			if (mt) { const [id, slug] = mt.slice(1); if (slug) return uniqSlug(+id, slug); }
		})
	},
	post: {
		get: async (req) => {
			const [slug, tag] = decodeURI(req.url).replace(/.*?\?/, '').split(',');
			if (slug) {
				const p = db.get(model(Post, { slug, published: 1 }));
				if (p) {
					if (tag && !tagPostCache.getTags(p.id).find((a) => a.name === tag))
						return resp('tag not exist', 404);
					const rp = reqPostCache.get({ postId: p.id }).map((a) => a.reqId);
					if (rp.length) {
						const cli = getClient(req);
						if (!cli || !cli.has({ type: PostPerm, _reqs: rp }))
							return resp('You do not have permission to view this post', 403);
					}
					p._cm = +(sys.comment && !(p.disCm || 0));
					const skips = noAccessPosts(getClient(req));
					const [pre, next] = getPostSibling(p.id, p.createAt, decodeURI(tag), skips || []);
					if (pre) p._u = pre; if (next) p._n = next;
					readManager.set(p.id, req);
					p._r = readManager.get(p.id);
					if (!p.desc) p._d = clipWords(await getPain(p.content), 140);
					return filter(patchPostTags([p])[0],
						['banner','_cm','desc','content','_d','createAt','_tag','title','_u','_n','_r'], false);
				}
			}
			return resp('post not found', 404);
		},
		delete: auth(Admin, async (req) => {
			const i = new Uint16Array(await req.arrayBuffer());
			i.forEach(readManager.rm);
			return db.delByPk(Post, [...i]).changes;
		}),
		patch: auth(Admin, async (req) => {
			const t = await req.text();
			const data: string[] = [];
			let start = 0;
			const max = t.length;
			for (let end = 0; end < max && data.length < 3; end++) {
				if (t[end] === ',') { data.push(t.slice(start, end)); start = end + 1; }
			}
			if (start < max) data.push(t.slice(start));
			if (data.length === 4) return postPatch(+data[0], +data[1], +data[2], data[3]);
			else return resp('patch error', 500);
		}),
		post: auth(Admin, async (req) => {
			const o = model(Post, await getReqJson(req)) as curPost;
			if (!o.id && o._) {
				const uuid = String(o._);
				await withDraftLock(uuid, async () => {
					const existing = db.get(model(Post, { draftUuid: uuid })) as Post | undefined;
					if (existing) { o.id = existing.id; }
					else { o.draftUuid = uuid; const d = model(Post, o) as { id: number }; db.save(d); if (!o.id && d.id) o.id = d.id; }
				});
			}
			const d = model(Post, o) as { id: number };
			db.save(d);
			if (o._p && o.id) {
				const current = db.get(model(Post, { id: o.id })) as Post | undefined;
				if (current?.draftUuid) { current.draftUuid = NULL.TEXT; db.save(current, { skipSave: true }); }
			}
			const v = diffObj(o as Post, d) as Obj<Post>;
			if (v) delete v.content;
			return filter(v, [], false);
		})
	},
	visitor: {
		get: auth(Read, (req) => {
			const params = new URL(req.url).searchParams;
			const id = params.get('id');
			const p = params.get('p') || 1;
			if (!id) return resp('no post id', 500);
			return pageBuilder(+p, VISITOR_PAGE_SIZE, PostRead, ['createAt desc'],
				['ip','createAt','ua','_geo'], ['pid=?', +id],
				(a) => { a.forEach((c) => c._geo = ipInfoStr(c.ip)); return a; });
		})
	},
	about: {
		post: auth(Admin, async (req) => { sys.about = (await req.text()) || ''; }),
		get() { return sys.about || ''; }
	},
};

import { uniqSlug, debugMode } from '../utils';
import { tagPostCache } from '$lib/server/cache';
export default apis;

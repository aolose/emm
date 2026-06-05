import type { Require } from '$lib/server/model';
import { Post, PostRead, PostTag, RequireMap, Tag } from '$lib/server/model';
import { Client } from '$lib/server/client';
import { DBProxy, getClient, getIp, model, sqlFields } from '$lib/server/utils';
import { db } from '$lib/server/index';
import { requireType } from '$lib/server/enum';
import type { DiffFn, Model, Obj, Timer } from '$lib/types';
import { publishedPost, tags } from '$lib/server/store';
import { diffStrSet } from '$lib/setStrPatchFn';
import { get } from 'svelte/store';
import { throttle } from '$lib/utils';
import { isbot } from 'isbot';
import { permission } from '$lib/enum';

export const requireMap = new Map<number, Require>();

export const clientMap = new Map<string, Client>();

// auto clean client
setInterval(() => {
	if (clientMap.size) {
		const n = Date.now();
		for (const [k, v] of clientMap) {
			if (v.destroy < n) {
				clientMap.delete(k);
			}
		}
	}
}, 1e3 * 3600);

export const eTags = new Map<string, number>();
export const tagPostCache = (() => {
	let tps: PostTag[] = [];
	/** tagId → Set<postId> */
	const tag2post = new Map<number, Set<number>>();
	/** postId → Set<tagId> */
	const post2tag = new Map<number, Set<number>>();

	const addIndex = (postId: number, tagId: number) => {
		let tp = tag2post.get(tagId);
		if (!tp) tag2post.set(tagId, (tp = new Set()));
		tp.add(postId);
		let pt = post2tag.get(postId);
		if (!pt) post2tag.set(postId, (pt = new Set()));
		pt.add(tagId);
	};
	const delIndex = (postId?: number | number[], tagId?: number | number[]) => {
		const pArr = postId ? ([] as number[]).concat(postId) : undefined;
		const tArr = tagId ? ([] as number[]).concat(tagId) : undefined;
		if (tArr) {
			for (const tid of tArr) {
				const tp = tag2post.get(tid);
				if (tp) {
					if (pArr) for (const pid of pArr) tp.delete(pid);
					else tp.clear();
					if (!tp.size) tag2post.delete(tid);
				}
			}
		}
		if (pArr) {
			for (const pid of pArr) {
				const pt = post2tag.get(pid);
				if (pt) {
					if (tArr) for (const tid of tArr) pt.delete(tid);
					if (!pt.size) post2tag.delete(pid);
				}
			}
		}
	};
	return {
		load() {
			tps = db.all(model(PostTag));
			tag2post.clear();
			post2tag.clear();
			for (const { postId, tagId } of tps) addIndex(postId, tagId);
		},
		delete(postId?: number | number[], tagId?: number | number[]) {
			const ids = new Set<number>();
			const pSet = new Set(([] as number[]).concat(postId || []));
			const tSet = new Set(([] as number[]).concat(tagId || []));
			if (!pSet.size && !tSet.size) return;
			tps.forEach(({ postId, tagId, id }) => {
				if ((!pSet.size || pSet.has(postId)) && (!tSet.size || tSet.has(tagId))) {
					ids.add(id);
				}
			});
			tps = tps.filter((a) => !ids.has(a.id));
			db.delByPk(PostTag, [...ids]);
			delIndex(postId, tagId);
		},
		setTags(postId: number, tagStr: string[]) {
			const pTags = this.getTags(postId);
			const ts = new Set(tagStr);
			const ids: number[] = [];
			pTags.forEach((a) => {
				if (ts.has(a.name)) {
					ts.delete(a.name);
				} else {
					ids.push(a.id);
				}
			});
			if (ts.size) {
				get(tags).forEach((t) => {
					if (ts.has(t.name)) {
						const pt = DBProxy(PostTag, { postId, tagId: t.id });
						tps.push(pt);
						addIndex(postId, t.id);
						ts.delete(t.name);
					}
				});
			}
			if (ts.size) {
				for (const t of ts) {
					const nt = DBProxy(Tag, { name: t });
					tags.update((ts) => ts.concat(nt));
					const pt = DBProxy(PostTag, { postId, tagId: nt.id });
					tps.push(pt);
					addIndex(postId, nt.id);
				}
			}
			if (ids.length) {
				this.delete(postId, ids);
			}
		},
		setPosts(tagId: number, postId: number[]) {
			const pSet = new Set(this.getPostIds(tagId));
			postId.forEach((p) => {
				if (pSet.has(p)) pSet.delete(p);
				else {
					const pt = DBProxy(PostTag, { postId: p, tagId });
					tps.push(pt);
					addIndex(p, tagId);
				}
			});
			if (pSet.size) {
				this.delete([...pSet], tagId);
			}
		},
		getTags(postId: number | number[]) {
			const pArr = ([] as number[]).concat(postId);
			const ids = new Set<number>();
			for (const pid of pArr) {
				const pt = post2tag.get(pid);
				if (pt) for (const tid of pt) ids.add(tid);
			}
			return get(tags).filter((a) => ids.has(a.id));
		},
		getPostIds(tagId: number) {
			const tp = tag2post.get(tagId);
			return tp ? [...tp] : [];
		}
	};
})();

export const reqPostCache = (() => {
	let c: RequireMap[] = [];
	return {
		load() {
			c = db.all(model(RequireMap, { type: requireType.Post }));
		},
		setPosts(reqId: number, postId: number[]) {
			const { add, del } = (diffStrSet as DiffFn<Set<number>>)(
				new Set(c.filter((a) => a.reqId === reqId).map((a) => a.targetId)),
				new Set(postId)
			);
			if (del) reqPostCache.rm({ postId: [...del], reqId });
			[...add].forEach((i) => {
				reqPostCache.add(i, reqId);
			});
		},
		setReqs(postId: number, reqId: number[]) {
			const { add, del } = (diffStrSet as DiffFn<Set<number>>)(
				new Set(c.filter((a) => a.targetId === postId).map((a) => a.reqId)),
				new Set(reqId)
			);
			if (del) reqPostCache.rm({ postId, reqId: [...del] });
			[...add].forEach((i) => {
				reqPostCache.add(postId, i);
			});
		},
		add(postId: number, reqId: number) {
			if (!c.find((a) => a.reqId === reqId && a.targetId === postId)) {
				const n = model(RequireMap, {
					reqId,
					targetId: postId,
					type: requireType.Post
				}) as RequireMap;

				db.save(n, { create: true });
				c = c.concat(n);
			}
		},
		get(rq: { postId?: number | number[]; reqId?: number | number[] } = {}) {
			const { postId, reqId } = rq;
			const pSet = postId ? new Set(([] as number[]).concat(postId)) : undefined;
			const rSet = reqId ? new Set(([] as number[]).concat(reqId)) : undefined;
			return c.filter((a) => {
				if ((pSet && !pSet.has(a.targetId)) || (rSet && !rSet.has(a.reqId))) {
					return false;
				}
				return true;
			});
		},
		rm(rq: { postId?: number | number[]; reqId?: number | number[] } = {}) {
			const { postId, reqId } = rq;
			const pSet = new Set(([] as number[]).concat(postId || []));
			const rSet = new Set(([] as number[]).concat(reqId || []));
			if (pSet.size + rSet.size === 0) return;
			const ks: number[] = [];
			c = c.filter((a) => {
				if ((!postId || pSet.has(a.targetId)) && (!reqId || rSet.has(a.reqId))) {
					ks.push(a.id);
					return false;
				}
				return true;
			});
			if (ks.length) {
				db.delByPk(RequireMap, ks);
			}
			return ks;
		}
	};
})();
type pagePatch<T> = (m: T[]) => T[];
export const combine =
	<T extends Model>(...fns: pagePatch<T>[]) =>
	(items: T[]) => {
		fns.forEach((fn) => (items = fn(items)));
		return items;
	};
export const getPostSibling = (id: number, create: number, tag: string, skips: number[]) => {
	const pn: { slug: string; title: string }[] = [];
	const s = new Set(skips);
	let ids: Set<number> | undefined;
	if (tag) {
		const tagId = tagPostCache.getTags(id).find((a) => a.name === tag)?.id;
		if (!tagId) return [];
		ids = new Set(tagPostCache.getPostIds(tagId));
		if (!ids.size) return [];
	}

	const filter = [...get(publishedPost)].filter((a) => (!ids || ids.has(a)) && !s.has(a));
	if (filter.length < 2) return [];
	filter.sort((a, b) => a - b);
	const idx = filter.indexOf(id);
	const p = filter[idx - 1];
	const n = filter[idx + 1];
	if (n) {
		const a = db.get(model(Post, { id: n }));
		if (a) pn[0] = { title: a.title, slug: a.slug };
	}
	if (p) {
		const a = db.get(model(Post, { id: p }));
		if (a) pn[1] = { title: a.title, slug: a.slug };
	}
	return pn;
};
export const patchPostTags = (ps: Post[]) =>
	ps.map((a) => {
		const tags = tagPostCache.getTags(a.id);
		if (tags.length) {
			a._tag = tags.map((n) => n.name).join();
			if (!a.banner) {
				const b = tags.find((a) => a.banner)?.banner;
				if (b) a.banner = b;
			}
		}
		return a;
	});
export const patchPostReqs = (ps: Post[]) =>
	ps.map((a) => {
		a._reqs = reqPostCache.get({ postId: a.id }).map((n) => ({
			id: n.reqId,
			name: requireMap.get(n.reqId)?.name || ''
		}));
		return a;
	});

export const noAccessPosts = (cli?: Client) => {
	let all = [...reqPostCache.get()].filter((a) => a.targetId);
	if (cli) {
		cli.clear();
		const rq = cli.getReqs();
		if (rq) all = all.filter((a) => !rq.get(a.reqId));
	}
	const s = all.length;
	return s ? all.map((a) => a.targetId) : undefined;
};

export const getPubTags = (cli?: Client) => {
	const ps = get(publishedPost);
	const ids = new Set(noAccessPosts(cli) || []);
	return tagPostCache.getTags([...ps]).filter((a) => {
		const ia = new Set(tagPostCache.getPostIds(a.id));
		for (const i of ia) {
			if (ids.has(i)) ia.delete(i);
		}
		return ia.size;
	});
};

export const readManager = (() => {
	const cMap = new Map<number, number>();
	const ok = throttle(1e3 * 60); // 1min
	return {
		rm(postId: number) {
			cMap.delete(postId);
			db.del(model(PostRead), 'pid=?', postId);
		},
		get(postId: number) {
			if (!postId) return 0;
			if (cMap.has(postId)) return cMap.get(postId) || 0;
			const n = db.count(PostRead, ['pid = ?', postId]);
			cMap.set(postId, n);
			return n;
		},
		set(postId: number, req: Request) {
			const ua = req.headers.get('user-agent');
			const ip = getIp(req);
			// only human allow
			if (
				!/^(::1|127\.0)/.test(ip) &&
				ua &&
				!isbot(ua) &&
				ok(`${postId}-${ip}`) &&
				!getClient(req)?.ok(permission.Admin)
			) {
				cMap.set(postId, (cMap.get(postId) ?? this.get(postId)) + 1);
				db.save(model(PostRead, { ip, ua, pid: postId }));
				// keep max 300 records per post
				const all = db.all(model(PostRead), `pid = ? order by createAt desc`, postId);
				if (all.length > 300) {
					const keepIds = all.slice(0, 300).map((r) => r.id);
					db.del(
						model(PostRead),
						`pid = ? and id not in (${sqlFields(keepIds.length)})`,
						postId,
						...keepIds
					);
				}
			}
		}
	};
})();

import { get } from 'svelte/store';
import { tags } from '$lib/server/store';
import { combine, patchPostReqs, patchPostTags, tagPostCache } from '$lib/server/cache';
import { model, pageBuilder, resp, sqlFields } from '$lib/server/utils';
import { Post } from '$lib/server/model';
import { getPain } from '$lib/utils';
import { db } from '$lib/server/index';
import { DiffMatchPatch } from 'diff-match-patch-typescript';
const dmp = new DiffMatchPatch();
export const pubPostList = (
	page: number,
	size: number,
	tag: string | null,
	skips?: number[],
	tagInfo = false
) => {
	const where: string[] = ['published=?'];
	const values: unknown[] = [1];
	let bn = null;
	let desc = null;
	if (tag) {
		const tg = get(tags).find((a) => a.name === tag);
		bn = tg?.banner;
		desc = tg?.desc;
		const ps = tg ? tagPostCache.getPostIds(tg.id) : [];
		if (ps.length) {
			where.push(`id in (${sqlFields(ps.length)})`);
			values.push(...ps);
		}
	}
	if (skips) {
		where.push(`id not in (${sqlFields(skips.length)})`);
		values.push(...skips);
	}
	const o = pageBuilder(
		page,
		size,
		Post,
		['createAt desc'],
		['banner', 'desc', 'publish', 'content', 'createAt', '_tag', 'title', 'slug'],
		[where.join(' and '), ...values],
		combine(patchPostTags, (arr) => {
			arr.forEach((a) => (a.content = getPain(a.content)));
			return arr;
		})
	);
	if (!tagInfo) return o;
	const e = o as { total: number; items: Post[]; bn?: number; desc?: string };
	if (bn) e.bn = bn;
	if (desc) e.desc = desc;
	return e;
};

let patchMap: Map<number, string>;
let curPost: number;
export const postList = (page: number, size: number, where?: [string, ...unknown[]]) => {
	const o = pageBuilder(
		page,
		size,
		Post,
		['createAt desc'],
		undefined,
		where,
		combine(patchPostTags, patchPostReqs)
	);
	return o;
};

export const postPatch = (id: number, ver: number, patch: string) => {
	if (!id || !patch) return resp('error patch', 500);
	if (curPost !== id) {
		curPost = id;
		patchMap = new Map();
		if (ver) return 0;
	}
	const p = model(Post, { id });
	if (!db.get(p)) return resp('post not exist', 404);
	if (ver === 0) {
		p.content_d = patch;
	} else {
		const content = patchMap.get(ver);
		if (content !== undefined) {
			const [r, status = []] = dmp.patch_apply(dmp.patch_fromText(patch), content);
			const err = status.find((a) => !a);
			if (err) return resp(0, 200);
			const nc = r;
			p.content_d = nc;
			for (const [v] of patchMap) {
				if (v < ver) patchMap.delete(v);
			}
		} else {
			return 0;
		}
	}
	db.save(p);
	ver++;
	patchMap.set(ver, p.content_d);
	return [ver, p.save].join();
};

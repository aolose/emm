import { get } from 'svelte/store';
import { tags } from '$lib/server/store';
import { combine, patchPostReqs, patchPostTags, tagPostCache } from '$lib/server/cache';
import { model, pageBuilder, resp, sqlFields } from '$lib/server/utils';
import { Post } from '$lib/server/model';
import { getPain } from '$lib/utils';
import { db } from '$lib/server/index';
import { DiffMatchPatch } from 'diff-match-patch-typescript';
import type { PatchObject } from 'diff-match-patch-typescript';

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
		if (!tg) return resp('tag not exist', 404);
		bn = tg.banner;
		desc = tg.desc;
		const ps = tagPostCache.getPostIds(tg.id);
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

export const postPatch = (id: number, ver: number, length: number, patch: string) => {
	if (!id || !patch) return resp('error patch', 500);
	if (curPost !== id) {
		curPost = id;
		patchMap = new Map();
		if (ver) return resp('patch ver error', 500);
	}
	const p = model(Post, { id });
	if (!db.get(p)) return resp('post not exist', 404);
	if (ver === 0) {
		p.content_d = patch;
	} else {
		for (const [v] of patchMap) {
			if (v < ver) patchMap.delete(v);
		}
		const content = patchMap.get(ver);
		if (content !== undefined) {
			const patchList: PatchObject[] = [];
			const [infText, ...diff] = patch.split('\x01');
			const infList = infText.split(',').map((a) => +a);
			const l = diff.length;
			let dataStart = l * 4;
			for (let i = 0; i < l; i++) {
				const [start1, start2, length1, length2] = infList.slice(i * 4, i * 4 + 4);
				const diffs: [number, string][] = [];
				const data = diff[i].split('\x00');
				if (data.length) {
					for (const s of data) {
						diffs.push([1 - infList[dataStart++], s]);
					}
				}
				patchList.push({ start1, start2, length1, length2, diffs });
			}
			const [r, status = []] = dmp.patch_apply(patchList, content);
			const err = status.find((a) => !a);
			if (err) {
				return resp('patch fail', 500);
			}
			if (r.length === length) {
				p.content_d = r;
			} else {
				return resp(`patch content length miss match ${r.length}:${length}`, 500);
			}
		} else {
			return resp('patch ver not found', 500);
		}
	}
	db.save(p);
	ver++;
	patchMap.set(ver, p.content_d);
	return [ver, p.save].join();
};

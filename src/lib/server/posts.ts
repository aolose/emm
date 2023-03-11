import { get } from 'svelte/store';
import { tags } from '$lib/server/store';
import { combine, patchPostTags, tagPostCache } from '$lib/server/cache';
import { pageBuilder, sqlFields } from '$lib/server/utils';
import { Post } from '$lib/server/model';
import { getPain } from '$lib/utils';

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
	const e = o as { bn?: string; desc?: string };
	if (bn) e.bn = bn;
	if (desc) e.desc = desc;
	return e;
};

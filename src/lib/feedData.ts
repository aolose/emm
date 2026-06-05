import { sys } from '$lib/server';
import { noAccessPosts } from '$lib/server/cache';
import { pubPostList } from '$lib/server/posts';
import type { Post } from '$lib/server/model';
import type { Obj } from '$lib/types';

export interface FeedItem {
	title: string;
	desc: string;
	slug: string;
	publish: number | null;
}

let data: { items: FeedItem[]; blogName: string; seoDesc: string } | null = null;
let dirty = true;

const build = async () => {
	const skips = noAccessPosts();
	const page = await pubPostList(1, 20, null, skips);
	if (page instanceof Response) {
		data = null;
		return;
	}
	const items: FeedItem[] = page.items.map((p: Obj<Post>) => ({
		title: p.title || '',
		desc: p.desc || '',
		slug: p.slug,
		publish: p.publish
	}));
	data = {
		items,
		blogName: sys.blogName || '',
		seoDesc: sys.seoDesc || ''
	};
};

export const feedData = {
	invalidate() {
		dirty = true;
	},
	async ensure() {
		if (dirty) {
			await build();
			dirty = false;
		}
	},
	get() {
		return data;
	}
};

import { feedData } from '$lib/feedData';
import type { FeedItem } from '$lib/feedData';

const renderItem = (post: FeedItem) => {
	const title = post.title;
	const desc = post.desc;
	const date_published = post.publish ? new Date(post.publish).toISOString() : '';
	const link = `__ORIGIN__/post/${post.slug}`;
	return {
		id: link,
		url: link,
		title,
		summary: desc,
		date_published
	};
};

let json = '';
let etag = '';

export const jsonFeedCache = {
	get() {
		return json;
	},
	getEtag() {
		return etag;
	},
	invalidate() {
		feedData.invalidate();
	},
	async refresh() {
		await feedData.ensure();
		const d = feedData.get();
		if (!d) {
			json = '';
			etag = '';
			return;
		}
		const feed = {
			version: 'https://jsonfeed.org/version/1.1',
			title: d.blogName,
			home_page_url: '__ORIGIN__/',
			feed_url: '__ORIGIN__/feed/json',
			description: d.seoDesc,
			items: d.items.map(renderItem)
		};
		json = JSON.stringify(feed);
		const encoder = new TextEncoder();
		const buffer = encoder.encode(json);
		const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		etag = `"${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}"`;
	}
};

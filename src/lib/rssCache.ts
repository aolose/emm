import { sys } from '$lib/server';
import { noAccessPosts } from '$lib/server/cache';
import { pubPostList } from '$lib/server/posts';
import type { Post } from '$lib/server/model';
import type { Obj } from '$lib/types';

const renderItem = (post: Obj<Post>): string => {
	const title = post.title || '';
	const desc = post?.desc || '';
	const pubDate = post.publish ? new Date(post.publish).toUTCString() : '';
	return `<item>
<guid>@/post/${post.slug}</guid>
<title><![CDATA[${title}]]></title>
<link>@/post/${post.slug}</link>
<description><![CDATA[${desc}]]></description>
<pubDate>${pubDate}</pubDate>
</item>`;
};

let xml = '';
let etag = '';
let dirty = true;

const build = async () => {
	const skips = noAccessPosts();
	const page = await pubPostList(1, 20, null, skips);
	if (page instanceof Response) {
		xml = '';
		etag = '';
		return;
	}
	const blogName = sys.blogName || '';
	const seoDesc = sys.seoDesc || '';
	const items = page.items.map(renderItem).join('');
	xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<atom:link href="@/rss" rel="self" type="application/rss+xml" />
<title><![CDATA[${blogName}]]></title>
<link>@</link>
<description><![CDATA[${seoDesc}]]></description>
${items}
</channel>
</rss>
`;
	const encoder = new TextEncoder();
	const buffer = encoder.encode(xml);
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	etag = `"${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}"`;
};

export const rssCache = {
	get() {
		return xml;
	},
	getEtag() {
		return etag;
	},
	/** mark cache as stale — next request will rebuild */
	invalidate() {
		dirty = true;
	},
	/** rebuild if dirty (call this at request time, inside an async context) */
	async refresh() {
		if (dirty) {
			await build();
			dirty = false;
		}
	}
};
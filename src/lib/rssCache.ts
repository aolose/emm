import { feedData } from '$lib/feedData';
import type { FeedItem } from '$lib/feedData';

const renderItem = (post: FeedItem): string => {
	const title = post.title;
	const desc = post.desc;
	const pubDate = post.publish ? new Date(post.publish).toUTCString() : '';
	return `<item>
<guid>__ORIGIN__/post/${post.slug}</guid>
<title><![CDATA[${title}]]></title>
<link>__ORIGIN__/post/${post.slug}</link>
<description><![CDATA[${desc}]]></description>
<pubDate>${pubDate}</pubDate>
</item>`;
};

let xml = '';
let etag = '';

export const rssCache = {
	get() {
		return xml;
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
			xml = '';
			etag = '';
			return;
		}
		const items = d.items.map(renderItem).join('');
		const lastBuildDate = new Date().toUTCString();
		xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<atom:link href="__ORIGIN__/feed/rss" rel="self" type="application/rss+xml" />
<title><![CDATA[${d.blogName}]]></title>
<link>__ORIGIN__</link>
<description><![CDATA[${d.seoDesc}]]></description>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
</channel>
</rss>
`;
		const encoder = new TextEncoder();
		const buffer = encoder.encode(xml);
		const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		etag = `"${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}"`;
	}
};

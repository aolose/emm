import { feedData } from '$lib/feedData';
import type { FeedItem } from '$lib/feedData';

const renderEntry = (post: FeedItem): string => {
	const title = post.title;
	const desc = post.desc;
	const updated = post.publish ? new Date(post.publish).toISOString() : '';
	const link = `__ORIGIN__/post/${post.slug}`;
	return `<entry>
<title><![CDATA[${title}]]></title>
<link href="${link}"/>
<id>${link}</id>
<updated>${updated}</updated>
<summary><![CDATA[${desc}]]></summary>
</entry>`;
};

let xml = '';
let etag = '';

export const atomCache = {
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
		const entries = d.items.map(renderEntry).join('');
		const updated = new Date().toISOString();
		xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title><![CDATA[${d.blogName}]]></title>
<subtitle><![CDATA[${d.seoDesc}]]></subtitle>
<link href="__ORIGIN__/feed/atom" rel="self"/>
<link href="__ORIGIN__/"/>
<id>__ORIGIN__/</id>
<updated>${updated}</updated>
${entries}
</feed>
`;
		const encoder = new TextEncoder();
		const buffer = encoder.encode(xml);
		const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		etag = `"${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}"`;
	}
};

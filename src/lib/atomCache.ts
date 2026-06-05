import { sys } from '$lib/server';
import { noAccessPosts } from '$lib/server/cache';
import { pubPostList } from '$lib/server/posts';
import type { Post } from '$lib/server/model';
import type { Obj } from '$lib/types';

const renderEntry = (post: Obj<Post>): string => {
	const title = post.title || '';
	const desc = post?.desc || '';
	const updated = post.publish ? new Date(post.publish).toISOString() : '';
	const link = `@/post/${post.slug}`;
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
	const entries = page.items.map(renderEntry).join('');
	const updated = new Date().toISOString();
	xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title><![CDATA[${blogName}]]></title>
<subtitle><![CDATA[${seoDesc}]]></subtitle>
<link href="@/atom" rel="self"/>
<link href="@/"/>
<id>@/</id>
<updated>${updated}</updated>
${entries}
</feed>
`;
	const encoder = new TextEncoder();
	const buffer = encoder.encode(xml);
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	etag = `"${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}"`;
};

export const atomCache = {
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

import type { Post } from '$lib/server/model';
import { sys } from '$lib/server';
import type { RequestHandler } from '@sveltejs/kit';
import { time } from '$lib/utils';
import { noAccessPosts } from '$lib/server/cache';
import { pubPostList } from '$lib/server/posts';
import type { Obj } from '$lib/types';

export const GET: RequestHandler = async ({ request, url }) => {
	const skips = noAccessPosts();
	const page = await pubPostList(1, 20, null, skips);
	const body = render(url.origin, page.items);
	const headers = {
		'Cache-Control': `max-age=0, s-max-age=${600}`,
		'Content-Type': 'application/xml'
	};
	return new Response(body, {
		headers
	});
};

const render = (base: string, posts: Obj<Post>[]) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<atom:link href="${base}/rss" rel="self" type="application/rss+xml" />
<title>${sys.blogName || ''}</title>
<link>${base}</link>
<description>${sys.seoDesc || ''}</description>
${posts
	.map(
		(post) => `<item>
<guid>${base}/post/${post.slug}</guid>
<title>${post.title}</title>
<link>${base}/post/${post.slug}</link>
<description>${(post?.desc || post?.content || '').substring(0, 140)}</description>
<pubDate>${time(post?.publish)}</pubDate>
</item>`
	)
	.join('')}
</channel>
</rss>
`;

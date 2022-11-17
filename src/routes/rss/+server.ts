import {Post} from '../../lib/server/model';
import {db, sys} from '../../lib/server';
import type {RequestHandler} from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    const data = db.all(new Post());
    const body = render(data);
    const headers = {
        'Cache-Control': `max-age=0, s-max-age=${600}`,
        'Content-Type': 'application/xml'
    };
    return new Response(body, {
        headers
    });
};

const render = (articles: Post[]) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<atom:link href="${sys.blogUrl}/rss" rel="self" type="application/rss+xml" />
<title>${sys.blogName} Posts</title>
<link>${sys.blogUrl}</link>
<description>${sys.blogBio}</description>
${articles
    .map(
        (post) => `<item>
<guid>${sys.blogUrl}/post/${post.slug}</guid>
<title>${post.title}</title>
<link>${sys.blogUrl}/post/${post.slug}</link>
<description>${post.desc}</description>
<pubDate>${new Date(post.publish).toUTCString()}</pubDate>
</item>`
    )
    .join('')}
</channel>
</rss>
`;

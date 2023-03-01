import type { Post } from "$lib/server/model";
import {sys } from "$lib/server";
import type { RequestHandler } from "@sveltejs/kit";
import { getPain, time } from "$lib/utils";
import { noAccessPosts } from "$lib/server/cache";
import { pubPostList } from "$lib/server/posts";

export const GET: RequestHandler = async ({ request, url }) => {
  const skips = noAccessPosts();
  const page = await pubPostList(1, 20, null, skips);
  const body = render(url.origin, page.items);
  const headers = {
    "Cache-Control": `max-age=0, s-max-age=${600}`,
    "Content-Type": "application/xml"
  };
  return new Response(body, {
    headers
  });
};

const render = (base: string, posts: Post[]) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<atom:link href="${sys.blogUrl || base}/rss" rel="self" type="application/rss+xml" />
<title>${sys.blogName || ""}</title>
<link>${sys.blogUrl || base}</link>
<description>${sys.blogBio || ""}</description>
${posts
  .map(
    (post) => `<item>
<guid>${sys.blogUrl || base}/post/${post.slug}</guid>
<title>${post.title}</title>
<link>${sys.blogUrl || base}/post/${post.slug}</link>
<description>${getPain(post.desc || post.content).substring(0, 140)}</description>
<pubDate>${time(post.publish)}</pubDate>
</item>`
  )
  .join("")}
</channel>
</rss>
`;

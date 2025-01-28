import { db } from '$lib/server';
import { model, sqlFields } from '$lib/server/utils';
import { Post } from '$lib/server/model';
import { getPubTags, noAccessPosts, tagPostCache } from '$lib/server/cache';
import type { siteMapRecord } from '$lib/types';
import { publishedPost } from '$lib/server/store';
import { get } from 'svelte/store';

let tmp = '';
const urls: siteMapRecord[] = [];
const start = Date.now();
let lastMod = Date.now();
const page = (base: string, total: number, size: number) => {
	urls.push({ url: base, lastMod: lastMod });
  let i = Math.ceil(total / size);
  while (i--) {
    urls.push({ url: base + (1 + i), lastMod: lastMod });
  }
};
const tm = (n: number) => new Date(n).toUTCString();
const load = () => {
  const noAccess = noAccessPosts();
  const where = noAccess?.length ? `id not in (${sqlFields(noAccess.length)})` : undefined;
  const allPSet = get(publishedPost);
  const pMap = new Map<number, { slug: string; last: number }>();
  db.all(model(Post), where, ...(noAccess || [])).forEach((a) => {
    const o = { slug: a.slug, last: a.modify || a.publish };
    pMap.set(a.id, o);
    urls.push({ url: '/post/' + a.slug, lastMod: o.last });
  });
  const allTags = getPubTags();
  urls.length = 0;
  urls.push({ url: '/', lastMod: start });
  urls.push({ url: '/about', lastMod: start });
  urls.push({ url: '/tags', lastMod: lastMod });
  page('/posts/', pMap.size, 10);
  allTags.forEach((a) => {
    const posts = tagPostCache.getPostIds(a.id).filter((a) => allPSet.has(a));
    page('/tag/' + a.name + '/', posts.length, 10);
    posts.forEach((n) => {
      const p = pMap.get(n);
      if (p) urls.push({ url: '/post/' + a.name + '/' + p.slug, lastMod: p.last });
    });
  });
  urls.sort((a, b) => {
    return a.url > b.url ? 1 : -1;
  });
  tmp =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((a) => `<url><loc>@${a.url}</loc><lastmod>${tm(a.lastMod)}</lastmod></url>`) +
    '</urlset>';
};
export const sitemap = {
  get last() {
    return lastMod;
  },
  render(base: string) {
    return tmp.replace(/@/g, base);
  },
  refresh() {
    lastMod = Date.now();
    load();
  }
};

import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import type { Post } from '$lib/server/model';
import { regHjs } from '$lib/hjs';

export const load = apiLoad('post', ({ params: { slug, tag } }) => [slug, tag || ''].join(), {
  method: method.GET,
  cache: 1e3 * 3600 * 3,
  async done(result) {
    const p = result as Post;
    const lang = new Set((p.content.match(/```[a-z0-9]+/g) || []).map((a) => a.slice(3)));
    if (lang.size) await regHjs(lang);
  }
});

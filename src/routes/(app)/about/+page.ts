import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { regHjs } from '$lib/hjs';

export const load = apiLoad('about', undefined, {
  method: method.GET,
  cache: 1e3 * 3600 * 3,
  async done(result) {
    const p = result as string;
    const lang = new Set((p.match(/```[a-z0-9]+/g) || []).map((a) => a.slice(3)));
    if (lang.size) await regHjs(lang);
  }
});

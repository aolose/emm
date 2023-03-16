import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = apiLoad('bio', undefined, { method: method.GET, cache: 1e3 * 3600 * 24 * 30 });

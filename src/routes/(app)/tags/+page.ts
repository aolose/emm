import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = apiLoad('tags', undefined, {
	method: method.GET,
	group: 'posts',
	cache: 1e3 * 3600 * 3
});

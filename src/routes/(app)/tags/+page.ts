import { useApi } from '$lib/req';
import { method } from '$lib/enum';

export const load = useApi('tags', undefined, {
	method: method.GET,
	group: 'posts',
	cache: 1e3 * 3600 * 3
});

import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = apiLoad(
	'posts',
	({ params: { page } }) => {
		return { page: +(page || 1), size: 10 };
	},
	{ method: method.GET, group: 'posts', cache: 1e3 * 3600 * 3 }
);

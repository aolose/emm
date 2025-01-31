import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { error } from '@sveltejs/kit';

export const load = apiLoad(
	'posts',
	({ params: { page = 1 } }) => {
		const a = +page;
		if (!a) error(404);
		else return { page: a, size: 12 };
	},
	{ method: method.GET, group: 'posts', cache: 1e3 * 3600 * 3 }
);

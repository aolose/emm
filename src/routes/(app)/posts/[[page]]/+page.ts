import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { error } from '@sveltejs/kit';

const baseLoad = apiLoad(
	'posts',
	({ params: { page = 1 } }) => {
		const a = +page;
		if (!a) error(404);
		else return { page: a, size: 12 };
	},
	{ method: method.GET, group: 'posts', cache: 1e3 * 3600 * 3 }
);

const hash = (s: string) => {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	return h.toString(36);
};

export const load = async (event) => {
	const result = await baseLoad(event);
	if (result.d) {
		event.setHeaders({
			etag: `"${hash(JSON.stringify(result.d))}"`,
			'cache-control': 'private, must-revalidate'
		});
	}
	return result;
};

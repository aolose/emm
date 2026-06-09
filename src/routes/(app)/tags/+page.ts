import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';

const baseLoad = apiLoad('tags', undefined, {
	method: method.GET,
	group: 'posts',
	cache: 1e3 * 3600
});

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

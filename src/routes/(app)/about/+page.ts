import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { regHjs } from '$lib/hjs';

const baseLoad = apiLoad('about', undefined, {
	method: method.GET,
	cache: 1e3 * 3600,
	async done(result) {
		const p = result as string;
		const lang = new Set((p.match(/```[a-z0-9]+/g) || []).map((a) => a.slice(3)));
		if (lang.size) await regHjs(lang);
	}
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

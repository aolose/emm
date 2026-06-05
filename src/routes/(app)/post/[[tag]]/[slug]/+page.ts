import { regHjs } from '$lib/hjs';

export const load = async (event) => {
	const d = event.data?.d;
	if (d?.content) {
		const lang = new Set((d.content.match(/```[a-z0-9]+/g) || []).map((a) => a.slice(3)));
		if (lang.size) await regHjs(lang);
	}
	return event.data;
};

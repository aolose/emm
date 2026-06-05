import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { renderMermaidBlocks } from '$lib/server/mermaid-ssr';

const baseLoad = apiLoad('post', ({ params: { slug, tag } }) => [slug, tag || ''].join(), {
	method: method.GET,
	cache: 1e3 * 3600 * 3
});

export const load = async (event) => {
	const result = await baseLoad(event);
	const d = result.d;
	if (d?.content?.includes('```mermaid')) {
		d.content = await renderMermaidBlocks(d.content);
	}
	return result;
};

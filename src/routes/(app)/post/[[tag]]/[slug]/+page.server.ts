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

	// Enable conditional requests (304 Not Modified) for __data.json.
	// SSR HTML already gets this from SvelteKit; data responses need it explicitly.
	if (d) {
		const etag = `"${Bun.hash(JSON.stringify(d)).toString(36)}"`;
		event.setHeaders({ etag, 'cache-control': 'private, must-revalidate' });
	}

	return result;
};

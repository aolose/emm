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
	if (!d) return result;

	if (d.content?.includes('```mermaid')) {
		d.content = await renderMermaidBlocks(d.content);
	}

	const etag = `"${Bun.hash(JSON.stringify(d)).toString(36)}"`;
	event.setHeaders({ etag, 'cache-control': 'private, must-revalidate' });

	// Resolve banner R2 info for direct URL
	const { sys, db } = await import('$lib/server');
	const { Res } = await import('$lib/server/model');
	if (d.banner) {
		const bannerRes = db.get(new Res(d.banner));
		if (bannerRes) {
			d.bannerR2Synced = !!bannerRes.r2Synced;
			d.bannerR2Key = bannerRes.r2Key || '';
		}
	}

	return {
		r2Domain: sys?.r2PublicDomain || '',
		r2Enabled: !!sys?.r2Enabled,
		...result
	};
};

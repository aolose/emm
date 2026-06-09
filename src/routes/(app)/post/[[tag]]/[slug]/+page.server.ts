import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { renderMermaidBlocks } from '$lib/server/mermaid-ssr';

const baseLoad = apiLoad('post', ({ params: { slug, tag } }) => [slug, tag || ''].join(), {
	method: method.GET,
	cache: 1e3 * 60 * 5
});

export const load = async (event) => {
	const result = await baseLoad(event);
	const d = result.d;
	if (!d) return result;

	if (d.content?.includes('```mermaid')) {
		d.content = await renderMermaidBlocks(d.content);
	}

	// ETag / cache-control handled globally by hooks.server.ts (addEtag)

	// Resolve banner R2 info for direct URL
	const { sys, db } = await import('$lib/server');
	const { Res } = await import('$lib/server/model');
	const { model } = await import('$lib/server/utils');
	if (d.banner) {
		const bannerRes = db.get(model(Res, { id: d.banner }));
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

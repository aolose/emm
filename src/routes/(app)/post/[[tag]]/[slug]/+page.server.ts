import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { renderMermaidBlocks } from '$lib/server/mermaid-ssr';
import { time, resUrl } from '$lib/utils';

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

	const r2Domain = sys?.r2PublicDomain || '';
	const r2Enabled = !!sys?.r2Enabled;

	// --- JSON-LD structured data for Google ---
	const view = d.desc || d._d || '';
	const jsonLdObj: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: d.title || '',
		datePublished: time(d.createAt),
		url: event.url.href
	};
	if (view) jsonLdObj.description = view;
	if (d.banner) {
		jsonLdObj.image =
			d.bannerR2Synced && r2Enabled
				? resUrl(r2Domain, d.bannerR2Key || d.banner, true, true)
				: `${event.url.origin}/res/_${d.banner}`;
	}
	// Build the full <script> tag — Svelte 5 does not process expressions inside <script> elements,
	// so we emit the complete tag via {@html ...} in the template.
	const jsonLd = `<script type="application/ld+json">${JSON.stringify(jsonLdObj).replace(/<\//g, '<\\/')}</script>`;

	return {
		r2Domain,
		r2Enabled,
		jsonLd,
		...result
	};
};
import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';

const CACHE_CONTROL = 'max-age=3600';

export const GET: RequestHandler = ({ request }) => {
	const icons = [48, 72, 96, 128, 192, 384, 512].map((a) => {
		const o = {
			src: `/i${a}.png`,
			sizes: `${a}x${a}`,
			type: 'image/png'
		} as { purpose?: string };
		if (a === 512) o.purpose = 'maskable';
		return o;
	});
	const data = {
		name: sys?.blogName,
		short_name: sys?.blogName,
		start_url: '/',
		display: 'standalone',
		background_color: '#000',
		scope: '/',
		theme_color: '#000',
		description: sys?.seoDesc,
		shortcuts: [
			{
				name: 'Write',
				url: '/admin'
			}
		],
		icons: icons
	};
	const json = JSON.stringify(data) || '';
	const etag = `"${Bun.hash(json).toString(36)}"`;
	const tag = request.headers.get('If-None-Match');
	if (tag === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				ETag: etag,
				'Cache-Control': CACHE_CONTROL
			}
		});
	}
	return new Response(json, {
		headers: {
			'Content-Type': 'application/manifest+json',
			ETag: etag,
			'Cache-Control': CACHE_CONTROL
		}
	});
};

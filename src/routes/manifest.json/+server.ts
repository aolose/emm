import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';

const etag = Date.now().toString(32);
export const GET: RequestHandler = ({ request }) => {
	const tag = request.headers.get('If-None-Match');
	if (tag === etag) return new Response(null, { status: 304 });
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
	const headers = {
		'Content-Type': 'application/manifest+json',
		etag
	};
	return new Response(JSON.stringify(data) || '', {
		headers
	});
};

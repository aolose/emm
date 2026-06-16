import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';

const CACHE_CONTROL = 'max-age=3600';

export const GET: RequestHandler = ({ request }) => {
	const data = {
		id: 'emm-pwa-app',
		name: sys?.blogName,
		short_name: sys?.blogName,
		start_url: '/',
		display: 'standalone',
		background_color: '#000',
		scope: '/',
		theme_color: '#000',
		description: sys?.seoDesc,
		screenshots: [
			{
				src: '/home.webp',
				sizes: '1280x720',
				type: 'image/webp',
				form_factor: 'wide',
				label: 'Home'
			},
			{
				src: '/home_m.webp',
				sizes: '750x1334',
				type: 'image/webp',
				form_factor: 'narrow',
				label: 'H5 Home'
			}
		],
		shortcuts: [
			{
				name: 'Write',
				url: '/admin',
				icons: [{ src: '/i96.png', sizes: '96x96', type: 'image/png' }]
			}
		],
		icons: [
			{ src: '/i48.png', sizes: '48x48', type: 'image/png' },
			{ src: '/i72.png', sizes: '72x72', type: 'image/png' },
			{ src: '/i96.png', sizes: '96x96', type: 'image/png' },
			{ src: '/i128.png', sizes: '128x128', type: 'image/png' },
			{ src: '/i192.png', sizes: '192x192', type: 'image/png' },
			{ src: '/i384.png', sizes: '384x384', type: 'image/png' },
			{ src: '/i512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/i512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
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

import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';
export const GET: RequestHandler = () => {
	const data = {
		$schema: 'https://json.schemastore.org/web-manifest-combined.json',
		name: sys.blogName,
		short_name: sys.blogName,
		start_url: '/',
		display: 'standalone',
		background_color: '#0f1319',
		scope: '/',
		theme_color: '#0f1319',
		description: sys.seoDesc,
		shortcuts: [
			{
				name: sys.blogName,
				short_name: sys.blogName,
				description: sys.seoDesc,
				icons: [
					{
						src: '/ico-192.png',
						sizes: '192x192'
					}
				]
			}
		],
		icons: [
			{
				src: '/favicon.ico',
				sizes: '32x32',
				type: 'image/png'
			},
			{
				src: '/apple-touch-icon.png',
				sizes: '180x180',
				type: 'image/png'
			},
			{
				src: '/ico-256.png',
				sizes: '256x256',
				type: 'image/png'
			},
			{
				src: '/ico-512.png',
				sizes: '512x512',
				type: 'image/png'
			}
		]
	};
	const headers = {
		'Content-Type': 'text/plain'
	};
	return new Response(JSON.stringify(data) || '', {
		headers
	});
};

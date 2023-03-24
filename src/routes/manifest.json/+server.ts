import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';
export const GET: RequestHandler = () => {
	const icons = [48,72,96,128,192,384,512].map(a=>{
		return 	{
			src: `/i${a}.png`,
			sizes: `${a}x${a}`,
			type: 'image/png',
			purpose: "any maskable"
		}
	})
	const data = {
		$schema: 'https://json.schemastore.org/web-manifest-combined.json',
		name: sys.blogName,
		short_name: sys.blogName,
		start_url: '/',
		display: 'standalone',
		background_color: '#000',
		scope: '/',
		theme_color: '#000',
		description: sys.seoDesc,
		icons: icons
	};
	const headers = {
		'Content-Type': 'text/plain'
	};
	return new Response(JSON.stringify(data) || '', {
		headers
	});
};

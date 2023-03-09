import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';

export const GET: RequestHandler = () => {
	const headers = {
		'Cache-Control': `max-age=0, s-max-age=${3600}`,
		'Content-Type': 'text/html'
	};
	return new Response(sys?.robots || '', {
		headers
	});
};

import type { RequestHandler } from '@sveltejs/kit';
import { sys } from '$lib/server';

export const GET: RequestHandler = () => {
	const headers = {
		'Content-Type': 'text/plain'
	};
	return new Response(sys?.robots || '', {
		headers
	});
};

import type { RequestHandler } from '@sveltejs/kit';
import { atomCache } from '$lib/atomCache';
import { server } from '$lib/server';

export const GET: RequestHandler = async ({ request, url }) => {
	if (server.maintain) return new Response('Service Unavailable', { status: 503 });

	// ensure cache is built (only rebuilds if dirty)
	await atomCache.refresh();

	let xml = atomCache.get();
	if (!xml) return new Response('Service Unavailable', { status: 503 });

	// replace placeholder with actual origin
	xml = xml.replace(/@/g, url.origin);

	const etag = atomCache.getEtag();
	const ifNoneMatch = request.headers.get('if-none-match');
	if (ifNoneMatch && etag && ifNoneMatch === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				'ETag': etag,
				'Cache-Control': 'max-age=0, s-max-age=600'
			}
		});
	}

	const headers: Record<string, string> = {
		'Cache-Control': 'max-age=0, s-max-age=600',
		'Content-Type': 'application/atom+xml; charset=utf-8'
	};
	if (etag) {
		headers['ETag'] = etag;
	}
	return new Response(xml, { headers });
};
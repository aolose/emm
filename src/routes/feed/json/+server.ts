import type { RequestHandler } from '@sveltejs/kit';
import { jsonFeedCache } from '$lib/jsonFeedCache';
import { server } from '$lib/server';

export const GET: RequestHandler = async ({ request, url }) => {
	if (server.maintain) return new Response('Service Unavailable', { status: 503 });

	await jsonFeedCache.refresh();

	let body = jsonFeedCache.get();
	if (!body) return new Response('Service Unavailable', { status: 503 });

	body = body.replaceAll('__ORIGIN__', url.origin);

	const etag = jsonFeedCache.getEtag();
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
		'Content-Type': 'application/feed+json; charset=utf-8'
	};
	if (etag) {
		headers['ETag'] = etag;
	}
	return new Response(body, { headers });
};

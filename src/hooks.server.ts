import type { Handle, HandleServerError } from '@sveltejs/kit';
import { contentType, encryptIv, encTypeIndex } from '$lib/enum';
import { firewallProcess } from '$lib/server/firewall';
import { checkStatue, sysStatue } from '$lib/server/utils';
import { server, sys } from '$lib/server';

checkStatue();
export const handle: Handle = async ({ event, resolve }) => {
	const rawIp = event.request.headers.get('x-forwarded-for') || event.getClientAddress();
	// x-forwarded-for format: client, proxy1, proxy2 (RFC 7239)
	// Also handles space-only separation for non-standard implementations
	event.locals.ip = rawIp.split(/ *, */)[0].trim();
	event.locals.cfCountry = event.request.headers.get('cf-ipcountry')?.toUpperCase() || '';
	event.locals.tsSiteKey = sys?.tsSiteKey || '';
	if (server.maintain && sysStatue > 1) return new Response('In maintenance', { status: 503 });
	//add headers to page load
	const fetch = event.fetch;
	const ua = event.request.headers.get('user-agent');
	if (ua && event.url.pathname.startsWith('/post/'))
		event.fetch = (url, cfg) => {
			cfg = cfg || {};
			cfg.headers = new Headers(cfg.headers || []);
			cfg.headers.set('user-agent', ua);
			cfg.headers.set('x-forwarded-for', event.locals.ip);
			return fetch(url, cfg);
		};
	const opts: Parameters<typeof resolve>[1] = {
		filterSerializedResponseHeaders: (name) =>
			[contentType, encryptIv, encTypeIndex, 'location'].indexOf(name.toLowerCase()) > -1
	};

	// Inject R2 host into HTML <head> for Service Worker cache pre-warming
	const r2Host = sys?.r2Enabled && sys?.r2PublicDomain ? new URL(sys.r2PublicDomain).host : '';
	if (r2Host) {
		opts.transformPageChunk = ({ html }) => {
			const script = `<script>caches.open('sw-config').then(c=>c.put('/__config/r2-host',new Response('${r2Host}')));</script>`;
			return html.replace('</head>', script + '</head>');
		};
	}

	return await firewallProcess(event, async () => {
		const response = await resolve(event, opts);
		return await addEtag(event, response);
	});
};

/**
 * Add ETag / 304 caching for frontend SSR pages.
 * Admin, API, and non-HTML responses are passed through unchanged.
 */
const FRONTEND_PAGE = /^\/($|about|posts(\/|$)|post\/|tags(\/|$)|tag\/)/;
async function addEtag(event: Parameters<Handle>[0]['event'], response: Response): Promise<Response> {
	const ct = response.headers.get('content-type') || '';
	if (response.status !== 200 || !ct.includes('text/html')) return response;
	if (!FRONTEND_PAGE.test(new URL(event.request.url).pathname)) return response;

	const clone = response.clone();
	const body = await clone.text();
	const hasher = new Bun.CryptoHasher('sha256');
	hasher.update(body);
	const etag = `"${hasher.digest('hex')}"`;

	const ifNoneMatch = event.request.headers.get('if-none-match');
	if (ifNoneMatch === etag) {
		const headers = new Headers(response.headers);
		headers.set('etag', etag);
		return new Response(null, { status: 304, headers });
	}

	const headers = new Headers(response.headers);
	headers.set('etag', etag);
	headers.set('cache-control', 'public, max-age=0, must-revalidate');
	return new Response(body, { status: response.status, headers });
}

export const handleError = (({ error }) => {
	console.error(error);
	const { data, message, status } = error as {
		status: number;
		data: string;
		message: string;
	};
	return {
		message: message || data,
		status: status
	};
}) satisfies HandleServerError;

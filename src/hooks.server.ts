import type { Handle, HandleServerError } from '@sveltejs/kit';
import { contentType, encryptIv, encTypeIndex } from '$lib/enum';
import { firewallProcess } from '$lib/server/firewall';
import { checkStatue, sysStatue } from '$lib/server/utils';
import { server, sys } from '$lib/server';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load template hashes (generated at build time) ──────────────────
let templateHashes: Record<string, string> = {};
const hashPaths = [
	'dist/template-hashes.json',
	'static/template-hashes.json'
];
for (const p of hashPaths) {
	try {
		if (existsSync(p)) {
			templateHashes = JSON.parse(readFileSync(p, 'utf-8'));
			break;
		}
	} catch {
		/* not found, continue */
	}
}
// Fallback: resolve relative to compiled server file (e.g. server/chunks → ../../template-hashes.json)
if (!Object.keys(templateHashes).length) {
	try {
		const serverDir = dirname(fileURLToPath(import.meta.url));
		const fallback = join(serverDir, '..', '..', 'template-hashes.json');
		if (existsSync(fallback)) {
			templateHashes = JSON.parse(readFileSync(fallback, 'utf-8'));
		}
	} catch {
		/* not found */
	}
}

/** Extract data-sveltekit-fetched payloads from rendered HTML. */
const FETCHED_RE =
	/<script type="application\/json" data-sveltekit-fetched data-url="([^"]*)"[^>]*>([\s\S]*?)<\/script>/g;

export function extractFetchedData(html: string): Array<{ url: string; data: unknown }> {
	const results: Array<{ url: string; data: unknown }> = [];
	let match: RegExpExecArray | null;
	while ((match = FETCHED_RE.exec(html)) !== null) {
		const url = match[1].replace(/&amp;/g, '&');
		try {
			const raw = JSON.parse(match[2]);
			let data: unknown;
			if (typeof raw.body === 'string') {
				try {
					data = JSON.parse(raw.body);
				} catch {
					data = raw.body;
				}
			} else {
				data = raw.body;
			}
			results.push({ url, data });
		} catch {
			/* malformed */
		}
	}
	return results;
}

/**
 * Extract SvelteKit hydration data embedded in the HTML.
 * For +page.server.ts pages, the page data is serialized inside the startup
 * script as `data: [...nodes]` within a kit.start() / app.start() call.
 */
const HYDRATION_RE = /data:\s*(\[[\s\S]*?\])\s*[,}]/;

export function extractHydrationData(html: string): string {
	const m = HYDRATION_RE.exec(html);
	return m ? m[1] : '';
}

/** Compute a deterministic data hash from fetched payloads + hydration data. */
export function computeDataHash(
	fetched: Array<{ url: string; data: unknown }>,
	hydration?: string
): string {
	if (!fetched.length && !hydration) return '';
	const parts: string[] = [];
	// Fetched API payloads
	if (fetched.length) {
		const sorted = [...fetched].sort((a, b) => a.url.localeCompare(b.url));
		parts.push(sorted.map((e) => `${e.url}␟${JSON.stringify(e.data)}`).join('␟'));
	}
	// Hydration data (page-server load output)
	if (hydration) parts.push(hydration);
	const payload = parts.join('\n');
	return createHash('sha256').update(payload).digest('hex').slice(0, 6);
}

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
		const etagged = await addEtag(event, response);
		return compressResponse(event.request, etagged);
	});
};

/** Unified Cache-Control header based on URL path. */
const CACHE_RULES: Array<{ pattern: RegExp; value: string }> = [
	// HTML pages — max-age=0 for browser (SW handles caching), s-maxage for CDN
	{ pattern: /^\/$/,                     value: 'public, max-age=0, s-maxage=86400, must-revalidate, no-transform' },
	{ pattern: /^\/about/,                 value: 'public, max-age=0, s-maxage=86400, must-revalidate, no-transform' },
	{ pattern: /^\/posts/,                 value: 'public, max-age=0, s-maxage=3600, must-revalidate, no-transform' },
	{ pattern: /^\/tag\//,                 value: 'public, max-age=0, s-maxage=3600, must-revalidate, no-transform' },
	{ pattern: /^\/tags/,                  value: 'public, max-age=0, s-maxage=3600, must-revalidate, no-transform' },
	{ pattern: /^\/post\//,                value: 'public, max-age=0, must-revalidate, no-transform' },
	// API — blog content
	{ pattern: /^\/api\/home/,             value: 'public, max-age=0, s-maxage=3600, must-revalidate, no-transform' },
	{ pattern: /^\/api\/about/,            value: 'public, max-age=0, s-maxage=86400, must-revalidate, no-transform' },
	{ pattern: /^\/api\/posts/,            value: 'public, max-age=0, s-maxage=600, must-revalidate, no-transform' },
	{ pattern: /^\/api\/post/,             value: 'public, max-age=0, must-revalidate, no-transform' },
	{ pattern: /^\/api\/tags/,             value: 'public, max-age=0, s-maxage=600, must-revalidate, no-transform' },
	{ pattern: /^\/api\/hello/,            value: 'public, max-age=0, s-maxage=86400, must-revalidate, no-transform' },
	// Auth-only endpoints — never cache
	{ pattern: /^\/api\/(check|logout)/,   value: 'private, no-store, no-transform' },
	// __data.json — public blog content
	{ pattern: /\/__data\.json/,           value: 'public, max-age=0, must-revalidate, no-transform' },
	// Other API — auth-gated
	{ pattern: /^\/api\//,                 value: 'private, max-age=0, must-revalidate, no-transform' }
];
const DEFAULT_CACHE = 'public, max-age=0, must-revalidate, no-transform';

function getCacheControl(pathname: string): string {
	for (const rule of CACHE_RULES) {
		if (rule.pattern.test(pathname)) return rule.value;
	}
	return DEFAULT_CACHE;
}

/**
 * Add ETag / 304 caching for frontend SSR pages.
 * ETag format: "template_hash-data_hash"
 *   - template_hash: from dist/template-hashes.json (build-time, layout chain hash)
 *   - data_hash: SHA-256 of sorted data-sveltekit-fetched payloads
 * Falls back to full-body SHA-256 when template hashes are unavailable (dev mode).
 */
const FRONTEND_PAGE = /^\/($|about|posts(\/|$)|post\/|tags(\/|$)|tag\/)/;
const DATA_JSON = /\/__data\.json/;
async function addEtag(event: Parameters<Handle>[0]['event'], response: Response): Promise<Response> {
	// ETag only makes sense for cacheable GET/HEAD requests
	const method = event.request.method.toUpperCase();
	if (method !== 'GET' && method !== 'HEAD') return response;

	const ct = response.headers.get('content-type') || '';
	if (response.status !== 200) return response;
	const url = new URL(event.request.url);
	const isDataJson = DATA_JSON.test(url.pathname);

	if (isDataJson && ct.includes('application/json')) {
		// __data.json (CSR data endpoint): ETag = hash(body), no template component
		return addDataJsonEtag(event, response);
	}

	if (url.pathname.startsWith('/api/')) {
		// API endpoints: ETag = hash(body), regardless of content-type
		return addDataJsonEtag(event, response);
	}

	if (!ct.includes('text/html')) return response;
	if (!FRONTEND_PAGE.test(url.pathname)) return response;

	const clone = response.clone();
	const body = await clone.text();

	// Compute template + data hash ETag
	const routeId = event.route.id; // e.g. "/(app)/post/[[tag]]/[slug]"
	const templateHash = templateHashes[routeId];
	let etag: string;

	let fetched: Array<{ url: string; data: unknown }> = [];
	let hydration = '';
	let dataHash = '';

	if (templateHash) {
		fetched = extractFetchedData(body);
		// Supplement with SvelteKit hydration data (+page.server.ts pages embed data via __sveltekit_data)
		hydration = extractHydrationData(body);
		dataHash = computeDataHash(fetched, hydration);
		etag = `W/"${templateHash}-${dataHash}"`;
	} else {
		// Fallback: full body hash (dev mode / template hashes not available)
		etag = `W/"${createHash('sha256').update(body).digest('hex').slice(0, 6)}"`;
	}

	const prevEtag = event.request.headers.get('if-none-match') || '(none)';

	if (prevEtag === etag) {
		return new Response(null, { status: 304, headers: { etag } });
	}

	const headers = new Headers(response.headers);
	headers.set('etag', etag);
	headers.set('cache-control', getCacheControl(url.pathname));
	return new Response(body, { status: response.status, headers });
}

/**
 * ETag for __data.json (CSR data endpoint).
 * Just hash the body — no template involved.
 */
async function addDataJsonEtag(
	event: Parameters<Handle>[0]['event'],
	response: Response
): Promise<Response> {
	const clone = response.clone();
	const body = await clone.text();
	const etag = `W/"${createHash('sha256').update(body).digest('hex').slice(0, 6)}"`;

	if (event.request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers: { etag } });
	}

	const headers = new Headers(response.headers);
	headers.set('etag', etag);
	headers.set('cache-control', getCacheControl(new URL(event.request.url).pathname));
	return new Response(body, { status: response.status, headers });
}

/**
 * Compress response body with gzip if client supports it.
 * ETag is computed before compression, so it remains valid.
 */
const COMPRESSIBLE = /text\/html|application\/json|text\/plain|text\/css|application\/javascript|text\/xml|application\/xml/;
async function compressResponse(request: Request, response: Response): Promise<Response> {
	const ae = request.headers.get('accept-encoding') || '';
	if (!ae.includes('gzip')) return response;

	const ct = response.headers.get('content-type') || '';
	if (!COMPRESSIBLE.test(ct)) return response;

	// Don't compress already-encoded responses
	if (response.headers.get('content-encoding')) return response;

	// Skip small responses via Content-Length (Bun auto-sets it for string bodies).
	// 1 KB threshold matches Express/Hono defaults — gzip header overhead (~20 bytes)
	// makes compression counterproductive below this size.
	const cl = response.headers.get('content-length');
	if (cl && +cl < 1024) return response;

	const body = await response.text();
	const compressed = Bun.gzipSync(new TextEncoder().encode(body));
	const headers = new Headers(response.headers);
	if (compressed.length >= body.length) {
		// No benefit — return a fresh Response since body was consumed by .text().
		// Returning the original would trigger "Response body is locked".
		headers.delete('content-length');
		return new Response(body, { status: response.status, headers });
	}

	headers.set('content-encoding', 'gzip');
	headers.delete('content-length');
	return new Response(compressed, { status: response.status, headers });
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
/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const channel = new BroadcastChannel('sw-messages');
const cachePrefix = 'sw-';
const CACHE = DEV ? 'sw-dev' : `${cachePrefix}${version}`;
const RES_CACHE = 'res';
const DATA_CACHE = 'emm-data';
const ASSETS = [...build, ...files];

// Navigation routes precached at install.
const PRECACHE_ROUTES = ['/', '/about', '/posts', '/tags'];

// ── Content routes eligible for ETag-aware stale-while-revalidate ──
const CONTENT_RE = /^\/($|about|posts(\/|$)|post\/|tags(\/|$)|tag\/)/;

/**
 * Extract data-sveltekit-fetched payloads from an HTML string.
 */
function extractFetchedData(html) {
	const results = [];
	const regex =
		/<script type="application\/json" data-sveltekit-fetched data-url="([^"]*)"[^>]*>([\s\S]*?)<\/script>/g;
	let match;
	while ((match = regex.exec(html)) !== null) {
		const url = match[1].replace(/&amp;/g, '&');
		try {
			const raw = JSON.parse(match[2]);
			let data;
			if (typeof raw.body === 'string') {
				try {
					data = JSON.parse(raw.body);
				} catch {
					data = raw.body;
				}
			} else {
				data = raw.body;
			}
			results.push([url, data]);
		} catch {
			/* malformed */
		}
	}
	return results;
}

// ── Install: precache static assets + warm content routes ──────────
self.addEventListener('install', (event) => {
	const { registration: { active } } = self;

	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);

		const dataCache = await caches.open(DATA_CACHE);
		const tasks = PRECACHE_ROUTES.map(async (route) => {
			try {
				const response = await fetch(route, {
					redirect: 'manual',
					headers: { 'X-SW-Precache': '1' }
				});
				if (response.status >= 300 && response.status < 400) return;
				if (!response.ok) return;
				const html = await response.text();
				// 提取并缓存 API 数据
				const entries = extractFetchedData(html);
				for (const [url, data] of entries) {
					await dataCache.put(
						new Request(url),
						new Response(JSON.stringify(data), {
							headers: {
								'Content-Type': 'application/json',
								'x-cache-ttl': String(Date.now() + 864e5)
							}
						})
					);
				}
				await cache.put(route, response);
			} catch {
				// 忽略错误
			}
		});
		await Promise.allSettled(tasks);
	}

	const p = addFilesToCache();
	event.waitUntil(p);
	if (active) {
		event.waitUntil(
			p.then(() => {
				self.skipWaiting();
				channel.postMessage({ type: 'CACHE_DONE' });
			})
		);
	}
});

// ── Activate: purge old version caches ─────────────────────────────
self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE && key !== DATA_CACHE && key.startsWith('sw-')) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

// ── Fetch: route-specific strategies ───────────────────────────────
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const pathname = url.pathname;

	// Admin, login, feeds, API, Turnstile — bypass SW entirely
	if (/^\/(admin|login|feed|api|ts-challenge)/.test(pathname)) return;

	if (DEV) {
		event.respondWith(devNetworkFirst(event.request));
		return;
	}

	// R2 resource (same-origin /res or cross-origin r2-host)
	const isRes = pathname.startsWith('/res/');
	if (isRes) {
		event.respondWith(resNetworkFirst(event.request));
		return;
	}

	// Content pages — cache-first, background ETag revalidation + notification
	if (CONTENT_RE.test(pathname)) {
		event.respondWith(contentStaleWhileRevalidate(event));
		return;
	}

	// Static assets — cache-first (immutable, hashed filenames)
	event.respondWith(staticCacheFirst(event.request));
});

// ── Strategy: Dev network-first ────────────────────────────────────
async function devNetworkFirst(request) {
	try {
		const response = await fetch(request);
		const cache = await caches.open(CACHE);
		cache.put(request, response.clone());
		return response;
	} catch {
		const cache = await caches.open(CACHE);
		return cache.match(request);
	}
}

// ── Strategy: R2 network-first ─────────────────────────────────────
async function resNetworkFirst(request) {
	const cache = await caches.open(RES_CACHE);

	// Resolve cross-origin R2 host
	let requestToSend = request;
	if (new URL(request.url).hostname !== self.location.hostname) {
		const configCache = await caches.open('sw-config');
		const configResponse = await configCache.match('/__config/r2-host');
		const r2Host = configResponse ? await configResponse.text() : '';
		if (r2Host) {
			requestToSend = new Request(request.url, {
				method: request.method,
				headers: request.headers,
				mode: 'cors',
				credentials: 'omit',
				redirect: request.redirect
			});
		}
	}

	try {
		const networkResponse = await fetch(requestToSend);
		// Cache 200 and 301 (permanent R2 redirects)
		if (networkResponse.status === 200 || networkResponse.status === 301) {
			await cache.put(request, networkResponse.clone());
		}
		return networkResponse;
	} catch {
		const cached = await cache.match(request, { ignoreSearch: true });
		if (cached) return cached;
		throw new Error('R2 resource unavailable offline');
	}
}

// ── Strategy: Static assets cache-first ────────────────────────────
async function staticCacheFirst(request) {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);
		if (response.ok) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch {
		return cached || new Response('Offline', { status: 503 });
	}
}

// ── Strategy: Content pages cache-first + background ETag refresh ──
/**
 * Return cached HTML immediately (fast FCP even on slow networks).
 * Background: If-None-Match with stored ETag.
 *   304 → page unchanged, just refresh cache timestamp.
 *   200 → page changed, update cache, post CONTENT_UPDATED to page.
 * Cache miss → wait for network.
 */
async function contentStaleWhileRevalidate(event) {
	const request = event.request;
	const cache = await caches.open(CACHE);
	const cachedResponse = await cache.match(request, { ignoreSearch: true });

	// ── Background revalidation (fire-and-forget) ──
	const revalidate = async () => {
		try {
			const headers = new Headers(request.headers);
			const etag = cachedResponse?.headers.get('etag');
			if (etag) headers.set('if-none-match', etag);

			const networkRequest = new Request(request.url, {
				method: 'GET',
				headers,
				redirect: 'follow'
			});
			const networkResponse = await fetch(networkRequest);

			if (networkResponse.status === 304) {
				if (cachedResponse) await cache.put(request, cachedResponse.clone());
				return;
			}

			if (networkResponse.ok) {
				await cache.put(request, networkResponse.clone());
				channel.postMessage({
					type: 'CONTENT_UPDATED',
					url: new URL(request.url).pathname
				});
			}
		} catch (err) {
			console.warn('[sw] background revalidate error:', err);
		}
	};

	// ── Cache hit → return immediately, revalidate in background ──
	if (cachedResponse) {
		event.waitUntil(revalidate());
		return cachedResponse;
	}

	// Cache miss → wait for network
	try {
		const networkResponse = await fetch(request);
		if (networkResponse.ok) await cache.put(request, networkResponse.clone());
		return networkResponse;
	} catch {
		return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
	}
}

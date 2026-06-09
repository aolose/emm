/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const channel = new BroadcastChannel('sw-messages');
const cachePrefix = 'sw-';
const CACHE = DEV ? 'sw-dev' : `${cachePrefix}${version}`;
const RES_CACHE = 'res';
const DATA_CACHE = 'emm-data';
const ASSETS = [...build, ...files];

// Navigation routes precached at install. The HTML contains SSR-embedded
// API data (<script data-sveltekit-fetched>) which we extract and store
// separately so req.ts can serve it offline.
const PRECACHE_ROUTES = ['/', '/about', '/posts', '/tags'];

/**
 * Extract data-sveltekit-fetched payloads from an HTML string.
 * Returns [url, parsedBody][] tuples.
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
					data = raw.body; // plain-text response (e.g. /api/tags)
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

self.addEventListener('install', (event) => {
	const {
		registration: { active }
	} = self;

	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);

		const dataCache = await caches.open(DATA_CACHE);
		const tasks = PRECACHE_ROUTES.map(async (route) => {
			try {
				const response = await fetch(route, { redirect: 'manual' });
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
				await cache.put(
					route,
					new Response(html, {
						headers: { 'Content-Type': 'text/html; charset=utf-8' }
					})
				);
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

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE && key !== DATA_CACHE && key.startsWith('sw-')) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const pathname = url.pathname;
	// Exclude admin, login, feeds, API, and Turnstile challenge from SW caching.
	// /ts-challenge must bypass SW so redirect-chains from Turnstile 307s reach
	// the server and clear the abandon timer (prevents false-positive blacklisting).
	if (/^\/(admin|login|feed|api|ts-challenge)/.test(pathname)) return;

	if (DEV) {
		async function devNetworkFirst() {
			try {
				const response = await fetch(event.request);
				const cache = await caches.open(CACHE);
				cache.put(event.request, response.clone());
				return response;
			} catch {
				const cache = await caches.open(CACHE);
				return cache.match(event.request);
			}
		}
		event.respondWith(devNetworkFirst());
		return;
	}

	async function respond() {
		let isRes = pathname.startsWith('/res/');

		if (!isRes && url.hostname !== self.location.hostname) {
			const configCache = await caches.open('sw-config');
			const configResponse = await configCache.match('/__config/r2-host');
			const r2Host = configResponse ? await configResponse.text() : '';
			if (r2Host && url.hostname === r2Host) isRes = true;
		}

		const currentCacheName = isRes ? RES_CACHE : CACHE;
		const cache = await caches.open(currentCacheName);

		try {
			const cachedResponse = await cache.match(event.request, { ignoreSearch: true });

			let requestToSend = event.request;
			// Ensure same-origin background fetches follow redirects so Turnstile
			// 307→200 chains reach /ts-challenge and clear the abandon timer.
			if (event.request.redirect !== 'follow') {
				requestToSend = new Request(event.request, { redirect: 'follow' });
			}
			if (isRes && url.hostname !== self.location.hostname && event.request.mode !== 'cors') {
				requestToSend = new Request(event.request.url, {
					method: event.request.method,
					headers: event.request.headers,
					mode: 'cors',
					credentials: 'omit',
					redirect: event.request.redirect
				});
			}

			const networkFetch = fetch(requestToSend)
				.then(async (networkResponse) => {
					if (networkResponse) {
						// /res/: cache 200 and 301 (permanent R2 redirects)
						// Other routes: only cache 200 (307 = Turnstile, skip)
						const cacheable = isRes
							? networkResponse.status === 200 || networkResponse.status === 301
							: networkResponse.status === 200;
						if (cacheable) {
							await cache.put(event.request, networkResponse.clone());
						}
					}
					return networkResponse;
				})
				.catch((fetchErr) => {
					console.warn('SW background fetch failed (offline):', fetchErr);
				});

			if (cachedResponse) {
				event.waitUntil(networkFetch);
				return cachedResponse;
			}

			const networkResponse = await networkFetch;
			if (networkResponse) return networkResponse;

			throw new Error('No cache and network failed');
		} catch (err) {
			console.error('SW crashed, safety fallback to network:', err);
			// Never return a raw fetch() promise — it may reject offline.
			// Return a proper error Response so event.respondWith() always gets a Response.
			return new Response('Offline — resource not cached', {
				status: 503,
				statusText: 'Service Unavailable'
			});
		}
	}

	event.respondWith(respond());
});
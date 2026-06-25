/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const channel = new BroadcastChannel('sw-messages');

// ── Turnstile challenge dedup: prevent flood when multiple SW fetches hit 403 ──
let _lastTsChallengeAt = 0;
const TS_CHALLENGE_COOLDOWN = 5000; // 5s

/**
 * Post a TS_CHALLENGE message to the page (deduped).
 * @param {string} redirectUrl - URL to redirect back to after challenge
 */
function postTsChallenge(redirectUrl) {
	const now = Date.now();
	if (now - _lastTsChallengeAt < TS_CHALLENGE_COOLDOWN) return;
	_lastTsChallengeAt = now;
	channel.postMessage({ type: 'TS_CHALLENGE', url: redirectUrl });
}

/** Extract the page path from a __data.json URL. */
function dataJsonToPagePath(url) {
	return new URL(url).pathname.replace(/\/__data\.json.*$/, '') || '/';
}

/** Check if a response is a turnstile challenge (via X-TS-Challenge header). */
function isTsChallengeResponse(response) {
	return response.headers.get('X-TS-Challenge') === '1';
}

const cachePrefix = 'sw-';
const CACHE = DEV ? 'sw-dev' : `${cachePrefix}${version}`;
const RES_CACHE = 'res';
const DATA_CACHE = 'emm-data';
const ASSETS = [...build, ...files];

// ── Delayed content cache warming (post Turnstile verification) ─────
const CONTENT_ROUTES = ['/', '/about', '/posts', '/tags'];
let _contentWarmed = false;

/**
 * Warm the content cache by fetching all content routes.
 * Called after first successful content page load (post-Turnstile).
 * Idempotent — skips routes already cached and won't re-run once done.
 */
async function warmContentCache() {
	if (_contentWarmed) return;
	_contentWarmed = true;

	const cache = await caches.open(CACHE);
	const dataCache = await caches.open(DATA_CACHE);

	for (const route of CONTENT_ROUTES) {
		if (await cache.match(route, { ignoreSearch: true })) continue;

		try {
			const response = await fetch(route, { redirect: 'manual' });
			if (response.status >= 300 && response.status < 400) continue;
			if (!response.ok) continue;
			if (isTsChallengeResponse(response)) continue;

			const html = await response.text();
			const entries = extractFetchedData(html);
			if (entries.length) await updateDataCache(entries);
			await cache.put(route, response);
		} catch { /* skip */ }
	}
}

// ── Content routes eligible for ETag-aware stale-while-revalidate ──
const CONTENT_RE = /^\/($|about|posts(\/|$)|post\/|tags(\/|$)|tag\/)/;

/**
 * Extract data-sveltekit-fetched payloads from an HTML string.
 * Returns [apiUrl, parsedData][] pairs.
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

/**
 * Update emm-data (Cache API) with extracted fetched payloads.
 * TTL: 24 hours from now.
 */
async function updateDataCache(entries) {
	const dataCache = await caches.open(DATA_CACHE);
	const ttl = Date.now() + 864e5; // 24h
	for (const [apiUrl, data] of entries) {
		await dataCache.put(
			new Request(apiUrl),
			new Response(JSON.stringify(data), {
				headers: {
					'Content-Type': 'application/json',
					'x-cache-ttl': String(ttl)
				}
			})
		);
	}
}

// ── Install: precache static assets ──────────────────────────────────
self.addEventListener('install', (event) => {
	const { registration: { active } } = self;

	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	const p = addFilesToCache();
	event.waitUntil(p);
	if (active) {
		event.waitUntil(
			p.then(() => {
				// Warm content cache on update (already verified, cookie present)
				warmContentCache();
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

	// CSR data endpoint (__data.json) — cache-first, bg ETag + triggers page refresh
	if (/\/__data\.json/.test(pathname)) {
		event.respondWith(dataJsonHandler(event));
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

// ── Message: listen for REFRESH_PAGE / WARM_CACHE from main thread ──
self.addEventListener('message', (event) => {
	if (event.data?.type === 'REFRESH_PAGE') {
		const { url, etag } = event.data;
		if (!url) return;
		refreshPageInBackground(url, etag);
	}
	if (event.data?.type === 'WARM_CACHE') {
		event.waitUntil(warmContentCache());
	}
});

/**
 * Background fetch a page with a predicted ETag.
 * Called when CSR detects data has changed.
 * 200 → page changed, update HTML cache.
 * 304 → prediction was wrong (shouldn't happen), no-op.
 */
async function refreshPageInBackground(url, predictedEtag) {
	try {
		const headers = new Headers();
		if (predictedEtag) headers.set('if-none-match', predictedEtag);

		headers.set('X-SW-Background', '1');
		const response = await fetch(url, { headers, redirect: 'manual' });

		if (response.status === 304) {
			// ETag prediction was wrong — page didn't change as expected (race condition)
			return;
		}

		if (response.ok) {
			const cache = await caches.open(CACHE);
			// Extract and update API data cache
			const clone = response.clone();
			const html = await clone.text();
			const entries = extractFetchedData(html);
			if (entries.length) {
				await updateDataCache(entries);
			}
			// Update HTML cache
			await cache.put(url, response);
		}
	} catch (err) {
		console.warn('[sw] REFRESH_PAGE error:', err);
	}
}

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

// ── Strategy: __data.json (CSR data endpoint) ──────────────────────
/**
 * Cache-first for __data.json responses.
 * Background ETag revalidation.
 * On 200 (data changed): update __data.json cache + trigger full page refresh
 * so the HTML page cache gets the latest data.
 */
async function dataJsonHandler(event) {
	const request = event.request;
	const cache = await caches.open(CACHE);
	const cachedResponse = await cache.match(request, { ignoreSearch: true });

	const revalidate = async () => {
		try {
			const headers = new Headers(request.headers);
			const etag = cachedResponse?.headers.get('etag');
			if (etag) headers.set('if-none-match', etag);
			headers.set('X-SW-Background', '1');

			const response = await fetch(request.url, { headers, redirect: 'manual' });

			if (response.status === 304) {
				// Cache is already fresh — no need to re-put.
				// Avoids clone() race with the page consuming cachedResponse.
				return;
			}

			// Turnstile challenge — notify page to redirect
			if (isTsChallengeResponse(response)) {
				postTsChallenge(dataJsonToPagePath(request.url));
				return;
			}

			if (response.ok) {
				await cache.put(request, response.clone());

				// Trigger full page refresh to update HTML cache
				const pageUrl = new URL(request.url).pathname.replace(/\/__data\.json.*$/, '') || '/';
				channel.postMessage({ type: 'REFRESH_PAGE', url: pageUrl });
			}
		} catch (err) {
			console.warn('[sw] __data.json revalidate error:', err);
		}
	};

	if (cachedResponse) {
		event.waitUntil(revalidate());
		return cachedResponse;
	}

	try {
		const swHeaders = new Headers(request.headers);
		swHeaders.set('X-SW-Background', '1');
		const response = await fetch(request.url, { headers: swHeaders, redirect: 'manual' });

		// Turnstile challenge — notify page to redirect
		if (isTsChallengeResponse(response)) {
			postTsChallenge(dataJsonToPagePath(request.url));
			return new Response(JSON.stringify({ error: 'Challenge required' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (response.ok) await cache.put(request, response.clone());
		return response;
	} catch {
		return new Response(JSON.stringify({ error: 'Offline' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// ── Strategy: Content pages cache-first + background ETag refresh ──
/**
 * Return cached HTML immediately (fast FCP even on slow networks).
 * Background: If-None-Match with stored ETag.
 *   304 → page unchanged, just refresh cache timestamp.
 *   200 → page changed, update cache, extract API data → update emm-data,
 *          post CONTENT_UPDATED to page.
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

			headers.set('X-SW-Background', '1');
			const networkRequest = new Request(request.url, {
				method: 'GET',
				headers,
				redirect: 'manual'
			});
			const networkResponse = await fetch(networkRequest);

			if (networkResponse.status === 304) {
				// Cache is already fresh — no need to re-put.
				// Avoids clone() race with the page consuming cachedResponse.
				return;
			}

			// Turnstile challenge — notify page to redirect
			if (isTsChallengeResponse(networkResponse)) {
				postTsChallenge(new URL(request.url).pathname);
				return;
			}

			if (networkResponse.ok) {
				// Extract API data from new HTML and update emm-data
				const clone = networkResponse.clone();
				const html = await clone.text();
				const entries = extractFetchedData(html);
				if (entries.length) {
					await updateDataCache(entries);
				}

				// Update HTML cache
				await cache.put(request, networkResponse.clone());

				// Notify page about update
				channel.postMessage({
					type: 'CONTENT_UPDATED',
					url: new URL(request.url).pathname,
					apiUrls: entries.map(([u]) => u)
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
		const swHeaders = new Headers(request.headers);
		swHeaders.set('X-SW-Background', '1');
		const networkResponse = await fetch(request.url, { headers: swHeaders, redirect: 'manual' });

		// Turnstile challenge — notify page to redirect
		if (isTsChallengeResponse(networkResponse)) {
			postTsChallenge(new URL(request.url).pathname);
			return new Response('Challenge required', { status: 403 });
		}

		if (networkResponse.ok) {
			await cache.put(request, networkResponse.clone());
			event.waitUntil(warmContentCache());
		}
		return networkResponse;
	} catch {
		return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
	}
}
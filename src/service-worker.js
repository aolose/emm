/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const channel = new BroadcastChannel('sw-messages');
const cachePrefix = 'sw-';
const CACHE = `${cachePrefix}${version}`;
const RES_CACHE = 'res';
const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

self.addEventListener('install', async (event) => {
	const {
		registration: { active }
	} = self;

	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	const p = addFilesToCache();
	event.waitUntil(p);
	if (active) {
		await p;
		self.skipWaiting();
		channel.postMessage({ type: 'CACHE_DONE' });
	} else {
		event.waitUntil(p);
	}
});
self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE && key.startsWith('sw-')) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const pathname = URL.parse(event.request.url).pathname;
	if (/^\/(api|admin|login|feed)/.test(pathname)) return;

	async function respond() {
		const url = new URL(event.request.url);

		// 1. Sync path check (works instantly for /res/ requests)
		let isRes = url.pathname.startsWith('/res/');

		// 2. Cross-origin request: may be R2 — read shared Cache
		if (!isRes && url.hostname !== self.location.hostname) {
			const configCache = await caches.open('sw-config');
			const configResponse = await configCache.match('/__config/r2-host');
			const r2Host = configResponse ? await configResponse.text() : '';
			if (r2Host && url.hostname === r2Host) isRes = true;
		}

		const cache = await caches.open(isRes ? RES_CACHE : CACHE);
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);
			if (response) {
				return response;
			}
		}
		try {
			const response = await fetch(event.request);
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}
			if (response.status === 200 || response.status === 0) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch (err) {
			const response = await cache.match(event.request);
			if (response) {
				return response;
			}
			throw err;
		}
	}

	event.respondWith(respond());
});

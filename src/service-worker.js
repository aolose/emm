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
	if (/^\/(api|admin|login|rss)/.test(pathname)) return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(url.pathname.startsWith('/res/') ? RES_CACHE : CACHE);
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
			if (response.status === 200) {
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

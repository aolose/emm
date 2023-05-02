// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { build, files, version } from '$service-worker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const sw = self as unknown as ServiceWorkerGlobalScope;
// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

sw.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

sw.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (/^\/(api|admin|login)/.test(url.pathname)) return;
	async function respond() {
		const cache = await caches.open(CACHE);
		if (ASSETS.includes(url.pathname)) {
			return cache.match(event.request);
		}
		try {
			const response = await fetch(event.request);

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			return cache.match(event.request);
		}
	}

	event.respondWith(respond() as PromiseLike<Response>);
});

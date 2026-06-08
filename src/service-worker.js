/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const channel = new BroadcastChannel('sw-messages');
const cachePrefix = 'sw-';
// Dev mode uses a fixed cache name — `version` changes on every Vite rebuild,
// which would otherwise trigger activate→delete and wipe the offline cache.
const CACHE = DEV ? 'sw-dev' : `${cachePrefix}${version}`;
const RES_CACHE = 'res';
const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

self.addEventListener('install', (event) => {
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
			if (key !== CACHE && key.startsWith('sw-')) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// 保持原样：非 GET 请求不拦截
	if (event.request.method !== 'GET') return;

	const pathname = URL.parse(event.request.url).pathname;
	if (/^\/(api|admin|login|feed)/.test(pathname)) return;

	// Dev mode (Vite HMR): network-first, populate cache for offline.
	// Always serves live Vite content; caches on the fly so offline has a full app shell.
	if (DEV) {
		async function networkFirst() {
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
		return event.respondWith(networkFirst());
	}

	async function respond() {
		const url = new URL(event.request.url);
		let isRes = url.pathname.startsWith('/res/');

		// 跨域处理：判断是否为 R2 资源
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
					if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
						await cache.put(event.request, networkResponse.clone());
					}
					return networkResponse;
				})
				.catch((fetchErr) => {
					console.warn('SW 后台更新缓存失败（可能处于离线状态）:', fetchErr);
				});

			if (cachedResponse) {
				event.waitUntil(networkFetch);
				return cachedResponse;
			}

			const networkResponse = await networkFetch;
			if (networkResponse) return networkResponse;

			throw new Error('No cache and network failed');
		} catch (err) {
			console.error('SW 处理请求崩溃，启动安全防御:', err);
			return fetch(event.request);
		}
	}

	event.respondWith(respond());
});

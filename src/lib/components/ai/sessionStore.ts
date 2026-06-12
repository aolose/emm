// IndexedDB-backed session store for AI chat messages.
// Keyed by postId. Sessions expire after 24h of inactivity.
// Cleanup runs on load.

import type { AiMessage } from './types';

const DB_NAME = 'ai_sessions';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;
const TTL_MS = 86_400_000; // 24 hours

interface SessionRecord {
	postId: number;
	messages: AiMessage[];
	updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(STORE_NAME, { keyPath: 'postId' });
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** Delete expired sessions (idle > TTL_MS). Called on load as idle cleanup. */
export async function cleanupExpired(): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	const store = tx.objectStore(STORE_NAME);
	const cursorReq = store.openCursor();

	return new Promise((resolve) => {
		const cutoff = Date.now() - TTL_MS;
		cursorReq.onsuccess = () => {
			const cursor = cursorReq.result;
			if (cursor) {
				if ((cursor.value as SessionRecord).updatedAt < cutoff) {
					cursor.delete();
				}
				cursor.continue();
			} else {
				db.close();
				resolve();
			}
		};
		cursorReq.onerror = () => {
			db.close();
			resolve();
		};
	});
}

/** Load session messages for a postId. Returns empty array if none or expired. */
export async function loadSession(postId: number): Promise<AiMessage[]> {
	if (postId == null) return [];
	await cleanupExpired();

	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readonly');
	const store = tx.objectStore(STORE_NAME);
	const req = store.get(postId);

	return new Promise((resolve) => {
		req.onsuccess = () => {
			db.close();
			const record = req.result as SessionRecord | undefined;
			if (!record) return resolve([]);
			// Check expiry
			if (record.updatedAt < Date.now() - TTL_MS) {
				// Will be cleaned next round; don't load stale data
				return resolve([]);
			}
			resolve(record.messages);
		};
		req.onerror = () => {
			db.close();
			resolve([]);
		};
	});
}

/** Save session messages for a postId. */
export async function saveSession(postId: number, messages: AiMessage[]): Promise<void> {
	if (postId == null) return;
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	const store = tx.objectStore(STORE_NAME);
	store.put({ postId, messages, updatedAt: Date.now() });

	return new Promise((resolve) => {
		tx.oncomplete = () => { db.close(); resolve(); };
		tx.onerror = () => { db.close(); resolve(); };
	});
}

/** Delete session for a postId. */
export async function deleteSession(postId: number): Promise<void> {
	if (postId == null) return;
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	tx.objectStore(STORE_NAME).delete(postId);
	return new Promise((resolve) => { tx.oncomplete = () => { db.close(); resolve(); }; });
}
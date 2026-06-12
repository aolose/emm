// Svelte stores for AI assistant state.

import { writable, get } from 'svelte/store';
import type { AiStatus, AiMessage, AiModel, PendingAction } from './types';
import { loadSession, saveSession, deleteSession } from './sessionStore';

export const aiStatus = writable<AiStatus>('checking');
export const aiMessages = writable<AiMessage[]>([]);
export const aiLoading = writable(false);
export const aiStreaming = writable('');
export const aiPending = writable<PendingAction | null>(null);

export const availableModels = writable<AiModel[]>([]);
export const deepThink = writable<boolean>(false);

/** Active session key: _aiSid (new posts) or id (existing posts). -1 when no session. */
export const aiPostId = writable<number>(-1);

// ── Auto-save: debounce-write to IndexedDB on message changes ───
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedJson = '';
let _saving = false;

function debouncedSave() {
	if (_saveTimer) clearTimeout(_saveTimer);
	_saveTimer = setTimeout(() => {
		const pid = get(aiPostId);
		if (pid < 0) return;
		const msgs = get(aiMessages);
		if (!msgs.length) return;
		const json = JSON.stringify(msgs);
		if (json === _lastSavedJson) return;
		_lastSavedJson = json;
		_saving = true;
		saveSession(pid, msgs).finally(() => { _saving = false; });
	}, 3000);
}

aiMessages.subscribe(() => debouncedSave());

// ── Session management ──────────────────────────────────────────

/** Save current session immediately (for post switch). */
export async function flushAiSession(): Promise<void> {
	if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
	const pid = get(aiPostId);
	if (pid < 0) return;
	const msgs = get(aiMessages);
	if (!msgs.length) return;
	const json = JSON.stringify(msgs);
	if (json === _lastSavedJson && !_saving) return;
	_lastSavedJson = json;
	await saveSession(pid, msgs);
}

/** Load session by key (_aiSid or post id), replacing current messages. */
export async function loadAiSession(sessionKey: number): Promise<void> {
	const key = sessionKey == null ? -1 : sessionKey;
	aiPostId.set(key);
	const msgs = await loadSession(key);
	_lastSavedJson = JSON.stringify(msgs);
	aiMessages.set(msgs);
	aiStreaming.set('');
	aiPending.set(null);
}

/** Reset conversation state (back to list / discard). */
export function aiReset() {
	flushAiSession();
	aiPostId.set(-1);
	_lastSavedJson = '';
	aiMessages.set([]);
	aiStreaming.set('');
	aiPending.set(null);
}

/** Start a fresh conversation for the current post (clear messages, keep session key). */
export function aiNewSession() {
	// Save current messages, then overwrite with empty to prevent old history from reloading
	const pid = get(aiPostId);
	if (pid >= 0) {
		saveSession(pid, []);  // overwrite IndexedDB with empty array
	}
	_lastSavedJson = '';
	aiMessages.set([]);
	aiStreaming.set('');
	aiPending.set(null);
}

/** Delete session for a post (called when post is deleted). */
export async function aiDeleteSession(postId: number): Promise<void> {
	if (get(aiPostId) === postId) {
		aiMessages.set([]);
	}
	await deleteSession(postId);
}
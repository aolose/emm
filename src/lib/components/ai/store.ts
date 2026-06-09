// Svelte stores for AI assistant state.

import { writable } from 'svelte/store';
import type { AiStatus, AiMessage, AiModel, PendingAction } from './types';

export const aiStatus = writable<AiStatus>('checking');
export const aiMessages = writable<AiMessage[]>([]);
export const aiLoading = writable(false);
export const aiStreaming = writable('');
export const aiPending = writable<PendingAction | null>(null);

export const availableModels = writable<AiModel[]>([]);
export const deepThink = writable<boolean>(false);

/** Reset conversation state when switching articles. */
export function aiReset() {
	aiMessages.set([]);
	aiStreaming.set('');
	aiPending.set(null);
}

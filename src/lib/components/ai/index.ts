// Barrel — public API for the AI assistant feature.
// Everything other modules need, re-exported from one place.

// ── Types ──────────────────────────────────────────────────────────
export type { AiStatus, AiMessage, AiModel, ToolCall, ToolDef, PendingAction } from './types';

// ── Stores ─────────────────────────────────────────────────────────
export {
	aiStatus,
	aiMessages,
	aiLoading,
	aiStreaming,
	aiPending,
	availableModels,
	deepThink,
	aiPostId,
	aiReset,
	aiNewSession,
	flushAiSession,
	loadAiSession,
	aiDeleteSession
} from './store';

// ── Chat loop ──────────────────────────────────────────────────────
export { validateAi, sendAiMessage } from './chat';
export type { SendOptions } from './chat';

// ── Tool definitions (if needed externally for inspection) ─────────
export { SYSTEM_PROMPT, AI_TOOLS } from './toolDefs';

// ── Location ────────────────────────────────────────────────────────
export { getUserLocation, preloadLocation } from './location';
export type { LocationResult, LocationStatus } from './location';

// ── Editor tools factory ───────────────────────────────────────────
export { createEditorTools } from './editorTools';
export type { EditorTools, EditorToolResult } from './editorTools';

// ── Components ─────────────────────────────────────────────────────
export { default as AiPanel } from './AiPanel.svelte';
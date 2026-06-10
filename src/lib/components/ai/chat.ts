// AI chat loop — sends messages to the DeepSeek API and
// orchestrates tool-call execution with user-approval gating.

import { get } from 'svelte/store';
import { req } from '$lib/req';
import { aiStatus, aiMessages, aiLoading, aiStreaming, aiPending } from './store';
import { SYSTEM_PROMPT, AI_TOOLS } from './toolDefs';
import type { AiMessage, ToolCall } from './types';

const writeTools = new Set([
	'replaceSelection',
	'replaceCurrentLine',
	'replaceCurrentParagraph',
	'replaceText',
	'replaceFullDocument',
	'insertAtCursor',
	'setTitle'
]);

// ── Validation ──────────────────────────────────────────────────────

export async function validateAi(): Promise<void> {
	aiStatus.set('checking');
	try {
		const result = await req('aiValidate', undefined, { method: 1 as never }); // GET
		const data = result as { valid: boolean; error?: string };
		if (data?.valid) {
			aiStatus.set('available');
		} else {
			aiStatus.set(data?.error ? 'invalid' : 'no_key');
		}
	} catch {
		aiStatus.set('error');
	}
}

// ── Send message ────────────────────────────────────────────────────

export interface SendOptions {
	model?: string;
	deepThink?: boolean;
}

export async function sendAiMessage(
	userContent: string,
	tools: Record<string, (args: Record<string, unknown>) => unknown>,
	opts?: SendOptions
): Promise<void> {
	aiMessages.update((ms) => [...ms, { role: 'user', content: userContent }]);
	aiLoading.set(true);
	aiStreaming.set('');

	try {
		// Shallow copy to avoid mutating the store's internal array reference
		const ms = [...get(aiMessages)];
		await runAiLoop(ms, tools, opts);
	} catch (e: unknown) {
		let msg: string;
		if (e && typeof e === 'object' && 'data' in e) {
			const d = (e as { data: Record<string, unknown> }).data;
			if (d?.error === 'AI_API_ERROR' || d?.error === 'AI_JSON_PARSE_ERROR') {
				const parts = [
					`⚠️ **AI 请求失败**`,
					``,
					`**原因**：${d.message || '未知错误'}`,
					`**模型**：${d.model || '—'}`,
				];
				if (d.detail) parts.push(`**API 详情**：${String(d.detail).slice(0, 300)}`);
				if (d.parseError) parts.push(`**解析错误**：${String(d.parseError)}`);
				if (d.bodyPreview && String(d.bodyPreview).length > 0) parts.push(`**返回预览**：\`${String(d.bodyPreview).slice(0, 200)}\``);
				if (d.lastUserMsg) parts.push(`**你的消息**：${String(d.lastUserMsg).slice(0, 150)}`);
				msg = parts.join('\n');
			} else {
				msg = `Error: ${JSON.stringify(e)}`;
			}
		} else if (e instanceof Error) {
			msg = `Error: ${e.message}`;
		} else {
			msg = `Error: ${String(e)}`;
		}
		aiMessages.update((ms) => [...ms, { role: 'assistant', content: msg }]);
	} finally {
		aiLoading.set(false);
	}
}

// ── Tool classification for ping-pong detection ──────────────────
const READ_TOOL_NAMES = new Set([
	'getSelection', 'getCurrentLine', 'getCurrentParagraph',
	'getCurrentSection', 'getFullDocument', 'getTitle',
	'getUserLocation', 'listModels', 'getMemory', 'analyzeWritingStyle', 'fetchUrl'
]);
const WRITE_TOOL_NAMES = new Set([
	'replaceSelection', 'replaceCurrentLine', 'replaceCurrentParagraph',
	'replaceText', 'replaceFullDocument', 'insertAtCursor', 'setTitle', 'saveMemory'
]);

async function runAiLoop(
	ms: AiMessage[],
	fns: Record<string, (args: Record<string, unknown>) => unknown>,
	opts?: SendOptions
): Promise<void> {
	const lastCalls: string[] = [];
	const lastOpKinds: string[] = []; // 'r' | 'w' | 'o' per turn, for ping-pong detection
	for (let i = 0; i < 25; i++) {
		const body: Record<string, unknown> = {
			messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...ms],
			tools: AI_TOOLS,
			stream: false
		};
		body.max_tokens = 32768;
		if (opts?.model) body.model = opts.model;
		// Always explicitly set thinking mode — API defaults to enabled otherwise
		body.thinking = opts?.deepThink ? { type: 'enabled' } : { type: 'disabled' };
		if (opts?.deepThink) {
			body.reasoning_effort = 'high';
		}

		const result = await req('ai', body, { method: 0 as never }); // POST
		const data = result as {
			choices?: Array<{
				finish_reason: string;
				message?: {
					role: string;
					content?: string;
					reasoning_content?: string;
					tool_calls?: ToolCall[];
				};
			}>;
		};

		const choice = data?.choices?.[0];
		if (!choice) {
			throw new Error('No response from AI');
		}

		// Check for error finish reasons before inspecting tool_calls / content
		if (choice.finish_reason === 'insufficient_system_resource') {
			ms.push({
				role: 'assistant',
				content: '(AI service is temporarily busy — please try again in a moment.)'
			});
			aiMessages.set([...ms]);
			return;
		}
		if (choice.finish_reason === 'content_filter') {
			ms.push({
				role: 'assistant',
				content: '(Response blocked by content filter — please rephrase your request.)'
			});
			aiMessages.set([...ms]);
			return;
		}

		// Check tool_calls presence rather than finish_reason — more robust
		// across different API behaviours (some return finish_reason="stop" with tools)
		if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
			const toolCalls = choice.message.tool_calls;

			// Detect loops: same tool+args called 3 times in a row
			const sig = toolCalls.map((tc) => `${tc.function.name}:${tc.function.arguments}`).join('|');
			lastCalls.push(sig);
			if (lastCalls.length > 3) lastCalls.shift();
			if (lastCalls.length === 3 && lastCalls[0] === sig && lastCalls[1] === sig) {
				console.warn('[AI] loop detected, breaking:', sig);
				ms.push({
					role: 'assistant',
					content: '(AI got stuck — please try rephrasing your request.)'
				});
				aiMessages.set([...ms]);
				return;
			}

			// ── Ping-pong detection: alternating reads & writes across turns ─
			const turnKind = toolCalls.some(tc => READ_TOOL_NAMES.has(tc.function.name)) ? 'r' :
			                 toolCalls.some(tc => WRITE_TOOL_NAMES.has(tc.function.name)) ? 'w' : 'o';
			lastOpKinds.push(turnKind);
			if (lastOpKinds.length > 8) lastOpKinds.shift();

			if (lastOpKinds.length >= 5) {
				const recent = lastOpKinds.slice(-5);
				const isAlternating = recent.every((k, idx) => idx === 0 || k !== recent[idx - 1]);
				const allReadWrite = recent.every(k => k === 'r' || k === 'w');
				const writeCount = recent.filter(k => k === 'w').length;
				if (isAlternating && allReadWrite && writeCount >= 2) {
					console.warn('[AI] ping-pong detected, breaking:', {
						pattern: recent.join('→'),
						turn: i,
						tools: toolCalls.map(tc => tc.function.name)
					});
					ms.push({
						role: 'assistant',
						content: '(AI 在反复交替读写文档，可能是文章太长导致无法一次输出。试试要求 "润色全文" 或拆分任务，而不是逐段修改。)'
					});
					ms.push(...toolCalls.filter(tc => !WRITE_TOOL_NAMES.has(tc.function.name)).map(tc => ({ role: 'tool' as const, content: JSON.stringify({ ok: false, error: 'ping-pong aborted' }), tool_call_id: tc.id })));
					aiMessages.set([...ms]);
					return;
				}
			}

			// Record assistant tool-call request & immediately sync to UI
			// so the user sees the reasoning content and tool-call progress
			ms.push({
				role: 'assistant',
				content: choice.message.content || '',
				reasoning_content: choice.message.reasoning_content || '',
				tool_calls: toolCalls
			});
			aiMessages.set([...ms]);

			// If any write tools present, ask user for approval
			let writeApproved = true;
			const writeCalls = toolCalls.filter((tc) => writeTools.has(tc.function.name));
			if (writeCalls.length > 0) {
				writeApproved = await new Promise<boolean>((resolve) => {
					aiPending.set({
						tool_calls: writeCalls,
						toolLabels: writeCalls.map((tc) => `${tc.function.name}(${tc.function.arguments})`),
						resolve
					});
				});
				aiPending.set(null);
			}

			// Execute every tool call — non-write tools always run;
			// write tools return rejection error if user declined.
			// Sync UI after each tool result so progress is visible.
			for (const tc of toolCalls) {
				if (writeTools.has(tc.function.name) && !writeApproved) {
					ms.push({
						role: 'tool',
						content: JSON.stringify({ ok: false, error: 'rejected by user' }),
						tool_call_id: tc.id
					});
					aiMessages.set([...ms]);
					continue;
				}

				const fn = fns[tc.function.name];
				if (fn) {
					try {
						let args: Record<string, unknown> = {};
						try {
							args = JSON.parse(tc.function.arguments);
						} catch {
							/* keep empty object */
						}
						// Pass the full args object — avoids Object.values()
						// ordering issues when parameter order shifts.
						const raw = await fn(args);
						ms.push({
							role: 'tool',
							content: typeof raw === 'string' ? raw : JSON.stringify(raw),
							tool_call_id: tc.id
						});
					} catch (err) {
						ms.push({
							role: 'tool',
							content: JSON.stringify({ error: `Execution error: ${err}` }),
							tool_call_id: tc.id
						});
					}
				} else {
					console.warn('[AI] unknown tool:', tc.function.name);
					ms.push({
						role: 'tool',
						content: JSON.stringify({ error: `Unknown tool: ${tc.function.name}` }),
						tool_call_id: tc.id
					});
				}
				aiMessages.set([...ms]);
			}
		} else {
			// Final text response — include reasoning_content so the UI
			// can render the thinking process.  (The API ignores it on
			// subsequent turns per DeepSeek docs, so no token waste.)
			const content = choice.message?.content || '';
			if (!content && !choice.message?.reasoning_content) {
				console.warn('[AI] empty final response');
			}
			ms.push({
				role: 'assistant',
				content,
				reasoning_content: choice.message?.reasoning_content || ''
			});
			aiMessages.set([...ms]);
			return;
		}
	}

	aiMessages.update((ms) => [
		...ms,
		{
			role: 'assistant',
			content: '(AI 执行步骤过多（超过 25 轮工具调用）。请尝试用更具体的一句话描述需求，或拆分为多个小任务。)'
		}
	]);
}
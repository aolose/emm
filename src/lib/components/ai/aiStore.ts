import { writable, get } from 'svelte/store';
import { req } from '$lib/req';

export type AiStatus = 'checking' | 'available' | 'no_key' | 'invalid' | 'error';

export interface AiMessage {
	role: 'user' | 'assistant' | 'tool' | 'system';
	content: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
}

export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface ToolDef {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, unknown>;
			required: string[];
		};
	};
}

export const aiStatus = writable<AiStatus>('checking');
export const aiMessages = writable<AiMessage[]>([]);
export const aiLoading = writable(false);
export const aiStreaming = writable('');

/** Reset state when switching articles */
export function aiReset() {
	aiMessages.set([]);
	aiStreaming.set('');
}

// ── Tool definitions ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant integrated into a markdown editor. You help with writing, brainstorming, research, and general discussion.

- Always respond in the same language as the user.
- Read tools: getSelection, getCurrentLine, getCurrentParagraph, getCurrentSection, getFullDocument, getTitle.
- Write tools: replaceCurrentLine(text), replaceCurrentParagraph(text), replaceText(searchText, newText), insertAtCursor(text), setTitle(title).
- When the user asks you to fix or modify content/title, read first, then apply using the write tools. Do not just print suggestions — call the tool.
- When the user asks for a title suggestion, call setTitle with your suggestion.
- For greetings, general Q&A, advice, or brainstorming, just respond directly.`;

const AI_TOOLS: ToolDef[] = [
	{
		type: 'function',
		function: {
			name: 'getSelection',
			description:
				'Get the text currently selected (highlighted) by the user in the editor. Returns whether there is a selection and the selected text. Use this when the user refers to "this" or "the selected text".',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'getCurrentLine',
			description:
				'Get the full text of the line where the cursor is currently placed. Returns the line number and text.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'getCurrentParagraph',
			description:
				'Get the paragraph (block of non-empty lines) around the cursor, delimited by blank lines. Returns the paragraph text and line range.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'getCurrentSection',
			description:
				'Get the markdown section around the cursor, from its heading to the next heading or end of document.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'getFullDocument',
			description:
				'Get the entire document content. Use only when the user asks for a full rewrite, global summary, or complete analysis. Returns text, line count, and total length.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'replaceCurrentLine',
			description:
				'Replace the entire current line (where the cursor is) with new text. Use after reading and discussing the line to apply corrections.',
			parameters: {
				type: 'object',
				properties: {
					text: { type: 'string', description: 'The new text to replace the current line with' }
				},
				required: ['text']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'replaceCurrentParagraph',
			description:
				'Replace the entire current paragraph (where the cursor is) with new text. Use after reading and discussing the paragraph to apply corrections.',
			parameters: {
				type: 'object',
				properties: {
					text: {
						type: 'string',
						description: 'The new text to replace the current paragraph with'
					}
				},
				required: ['text']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'replaceText',
			description:
				'Precisely replace a specific substring in the document. Finds the first occurrence of searchText and replaces it with newText. Use for surgical fixes like correcting a typo or changing a specific phrase.',
			parameters: {
				type: 'object',
				properties: {
					searchText: { type: 'string', description: 'The exact text to find and replace' },
					newText: { type: 'string', description: 'The replacement text' }
				},
				required: ['searchText', 'newText']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'insertAtCursor',
			description: 'Insert text at the current cursor position.',
			parameters: {
				type: 'object',
				properties: { text: { type: 'string', description: 'Text to insert' } },
				required: ['text']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'getTitle',
			description: 'Get the current article title.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'setTitle',
			description: 'Set the article title to a new value.',
			parameters: {
				type: 'object',
				properties: { title: { type: 'string', description: 'New title text' } },
				required: ['title']
			}
		}
	}
];

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

export async function sendAiMessage(
	userContent: string,
	tools: Record<string, () => unknown>,
	model?: string
): Promise<void> {
	aiMessages.update((ms) => [...ms, { role: 'user', content: userContent }]);
	aiLoading.set(true);
	aiStreaming.set('');

	try {
		const ms = get(aiMessages);
		await runAiLoop(ms, tools, model);
	} catch (e) {
		aiMessages.update((ms) => [...ms, { role: 'assistant', content: `Error: ${e}` }]);
	} finally {
		aiLoading.set(false);
	}
}

async function runAiLoop(
	ms: AiMessage[],
	fns: Record<string, () => unknown>,
	model?: string
): Promise<void> {
	// Limit loop iterations to prevent infinite tool-call cycles
	for (let i = 0; i < 5; i++) {
		const body = {
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				...ms.filter((m) => m.role !== 'tool' || m.tool_call_id)
			],
			tools: AI_TOOLS,
			model,
			stream: false
		};

		const result = await req('ai', body, { method: 0 as never }); // POST
		const data = result as {
			choices?: Array<{
				finish_reason: string;
				message?: {
					role: string;
					content?: string;
					tool_calls?: ToolCall[];
				};
			}>;
		};

		console.log('[AI] client ←', JSON.stringify(data).slice(0, 500));

		const choice = data?.choices?.[0];
		if (!choice) {
			console.error('[AI] unexpected response shape', data);
			throw new Error('No response from AI');
		}

		console.log('[AI] choice →', {
			finish_reason: choice.finish_reason,
			hasContent: !!choice.message?.content,
			contentPreview: choice.message?.content?.slice(0, 100),
			toolCallCount: choice.message?.tool_calls?.length
		});

		if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
			// Add assistant message with tool_calls (may also have partial content)
			ms.push({
				role: 'assistant',
				content: choice.message.content || '',
				tool_calls: choice.message.tool_calls
			});

			// Execute each tool call
			console.log('[AI] available fns:', Object.keys(fns));
			for (const tc of choice.message.tool_calls) {
				const fn = fns[tc.function.name];
				if (fn) {
					let args: unknown;
					try {
						args = JSON.parse(tc.function.arguments);
					} catch {
						args = {};
					}
					const result =
						typeof args === 'object' && args !== null && !Array.isArray(args)
							? fn(...Object.values(args as Record<string, unknown>))
							: fn();
					const resultStr = result !== undefined ? JSON.stringify(result).slice(0, 500) : '(void)';
					console.log(
						'[AI] tool →',
						tc.function.name,
						'args:',
						tc.function.arguments,
						'→',
						resultStr
					);
					ms.push({
						role: 'tool',
						content: JSON.stringify(result),
						tool_call_id: tc.id
					});
				} else {
					console.warn('[AI] unknown tool:', tc.function.name);
					ms.push({
						role: 'tool',
						content: JSON.stringify({ error: `Unknown tool: ${tc.function.name}` }),
						tool_call_id: tc.id
					});
				}
			}
			// Update store with current messages (so user sees "AI is reading document...")
			aiMessages.set([...ms]);
		} else {
			// Final answer (or empty stop)
			const content = choice.message?.content || '';
			if (!content) {
				console.warn('[AI] empty final response');
			}
			ms.push({
				role: 'assistant',
				content
			});
			aiMessages.set([...ms]);
			return;
		}
	}

	aiMessages.update((ms) => [
		...ms,
		{
			role: 'assistant',
			content: '(AI exceeded maximum tool-call iterations)'
		}
	]);
}

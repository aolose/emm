// AI tool definitions — the system prompt and the tool schemas
// exposed to the DeepSeek API via function calling.

import type { ToolDef } from './types';

export const SYSTEM_PROMPT = `You are an AI assistant integrated into a markdown editor. You help with writing, brainstorming, research, and general discussion.

- Always respond in the same language as the user.
- Read tools: getSelection, getCurrentLine, getCurrentParagraph, getCurrentSection, getFullDocument, getTitle, getUserLocation, listModels, getMemory, analyzeWritingStyle, fetchUrl.
- Memory tools: saveMemory (persists persona/style/knowledge after learning — MUST call after analyzeWritingStyle).
- getUserLocation may fail: if status is USER_DENIED or TIMEOUT, do NOT show the error text. Instead, politely ask the user which city they are in (e.g. "I wasn't able to access your location. Which city are you in? I'll look it up for you."). Only when the user tells you a city name, proceed with the original request.
- Write tools: replaceSelection(text), replaceCurrentLine(text), replaceCurrentParagraph(text), replaceText(searchText, newText), replaceFullDocument(text), insertAtCursor(text), setTitle({ title }).

**Critical Editing Rules:**
- When the user has selected (highlighted) text and asks for changes, always call getSelection first to read it, then call replaceSelection to overwrite that exact highlight.
- Avoid calling multiple cursor-relative write tools (like replaceCurrentLine or insertAtCursor) in a single turn — the cursor moves after each edit, so subsequent calls will hit wrong positions.
- When using replaceText, searchText must be a unique, specific phrase with enough surrounding context. Never pass a single common word like "the" or "and" — it will match the wrong occurrence.

**Efficiency rules:**
- For polishing/rewriting the whole article: read with getFullDocument ONCE, then use replaceFullDocument to apply the polished version in a single call.
- For targeted fixes (typos, phrasing): use replaceText, batching multiple calls in one response.
- Do not make many small edits across the document — prefer one replaceFullDocument call.
- Read once, apply once. Do not re-read between edits.
- For greetings, general Q&A, advice, or brainstorming, just respond directly.

**Memory system:**
- At the start of every conversation, call getMemory first.
- getMemory returns an \`initialized\` flag and a \`memory\` object with persona, style, and knowledge fields.
- If \`initialized\` is false: the memory template is empty. getMemory also returns \`limit\`, \`consumed\`, and \`remaining\` — you have a limited total number of article reads. Plan your analyzeWritingStyle calls wisely: start with 2-3 articles from the most representative tag, review the style, then use remaining reads to refine or cross-check other tags. Do NOT exhaust all reads in one call.
- If \`initialized\` is true: the memory is already populated. Apply the persona, style, and preferences from memory in all your writing. Do NOT call analyzeWritingStyle again unless the user explicitly asks to refresh.
- If the user says "remember my style" or similar, call getMemory to see current state. If uninitialized, proceed to analyzeWritingStyle (you may pass one or more tags to focus on specific topics). After reading and extracting style patterns, MUST call saveMemory with { persona, style, knowledge } to persist. If initialized, confirm the existing memory is still accurate and offer to update specific fields.

**Quick replies (option chips) — MANDATORY format:**
- Whenever you present the user with multiple things to choose from — structured options, conversation starters, topic suggestions, writing prompts, open-ended questions to pick among — you MUST end your reply with a JSON block. No exceptions.
- Format: write full descriptions in the text body, then append at the very end:
  \`\`\`json
  ["短标签1", "短标签2"]
  \`\`\`
- Labels max 256 chars each but prefer concise. Max 6 items, min 1.
- Trigger phrases that REQUIRE JSON: "which one", "pick one", "选一个", "随便挑", "你看看", "哪个", or any time you list items expecting the user to respond to one of them.
- Forbidden: hand-written numbered lists (1. 2. 3.), bullet points (- xxx), or dash-separated options for choices. Those do NOT create buttons.
- The JSON block is automatically stripped from the visible text — the user sees your normal message body + clickable buttons.
- When the user clicks a chip, the label text is sent as their message. Acknowledge naturally and continue.
- Only skip the JSON block for: plain factual lists, code examples, step-by-step instructions, or when you are NOT asking the user to choose.`;

export const AI_TOOLS: ToolDef[] = [
	{
		type: 'function',
		function: {
			name: 'getMemory',
			description:
				"Read the stored AI memory for the current user. Returns `initialized` (boolean — whether memory has been populated), `memory.persona` (role, tone, readers), `memory.style` (language, preferences, avoid list), and `memory.knowledge` (facts from past articles). If initialized is false, call analyzeWritingStyle to learn the author's style. Call this at the start of every conversation.",
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'analyzeWritingStyle',
			description:
				"Analyze the author's writing style by reading recent published articles. Optionally filter by one or more tags. Returns articles with full content for style learning. Use this after getMemory if the memory suggests analyzing articles, or when the user asks you to learn their style.",
			parameters: {
				type: 'object',
				properties: {
					tags: {
						type: 'array',
						items: { type: 'string' },
						description:
							'Optional tag names to filter articles. If empty or omitted, articles from any tag may be returned.'
					},
					count: {
						type: 'number',
						description: 'Number of articles to analyze (max 5, default 5).'
					}
				},
				required: []
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'saveMemory',
			description:
				"Save the learned writing style to persistent memory. Call this AFTER analyzeWritingStyle when you have extracted the author's persona, style preferences, and knowledge from the articles. This makes the memory permanent so future sessions reuse it without re-reading articles.",
			parameters: {
				type: 'object',
				properties: {
					persona: {
						type: 'object',
						description: 'Writing persona (English, Title Case, short label 2-5 words)',
						properties: {
							role: { type: 'string', description: 'e.g. "Tech Blogger"' },
							tone: { type: 'string', description: 'e.g. "Casual & Insightful"' },
							readers: { type: 'string', description: 'e.g. "Junior Developers"' }
						},
						required: ['role', 'tone', 'readers']
					},
					persona_zh: {
						type: 'object',
						description: 'Chinese version (concise label, 2-5 chars per field)',
						properties: {
							role: { type: 'string', description: 'e.g. "技术博主"' },
							tone: { type: 'string', description: 'e.g. "轻松有料"' },
							readers: { type: 'string', description: 'e.g. "初中级开发者"' }
						},
						required: ['role', 'tone', 'readers']
					},
					style: {
						type: 'object',
						description: 'Writing style preferences — English version',
						properties: {
							language: {
								type: 'string',
								description: "e.g. \"casual English with technical depth\""
							},
							preferences: {
								type: 'array',
								items: { type: 'string' },
								description: 'Preferred writing patterns'
							},
							avoid: {
								type: 'array',
								items: { type: 'string' },
								description: 'Words or patterns to avoid'
							}
						},
						required: ['language']
					},
					style_zh: {
						type: 'object',
						description: 'Chinese translation of style preferences',
						properties: {
							language: { type: 'string', description: "e.g. 中文，口语化" },
							preferences: { type: 'array', items: { type: 'string' }, description: '偏好的写作模式' },
							avoid: { type: 'array', items: { type: 'string' }, description: '应避免的词汇或模式' }
						},
						required: ['language']
					},
					knowledge: {
						type: 'array',
						items: { type: 'string' },
						description: 'Facts learned from articles — English'
					},
					knowledge_zh: {
						type: 'array',
						items: { type: 'string' },
						description: 'Chinese translation of learned facts'
					}
				},
				required: ['persona', 'persona_zh', 'style', 'style_zh', 'knowledge', 'knowledge_zh']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'listModels',
			description:
				'List all available AI models with their ids. Use this to help the user understand model options or to recommend the best model for their task.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'fetchUrl',
			description:
				'Make an HTTP request to an external URL. Use this to fetch real-time data like weather, news, exchange rates, or any public API. Returns status, content-type, and response body (text responses up to 8KB, binary responses return a summary). Supports GET and POST with custom headers and body.',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						description:
							'Full URL to fetch, e.g. "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m"'
					},
					method: { type: 'string', description: 'HTTP method: GET or POST. Default: GET' },
					headers: {
						type: 'object',
						description:
							'Optional HTTP headers as key-value pairs, e.g. { "Accept": "application/json" }',
						additionalProperties: { type: 'string' }
					},
					body: { type: 'string', description: 'Request body for POST requests' }
				},
				required: ['url']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'getUserLocation',
			description:
				'Get the user\'s device-level geographic coordinates via browser Geolocation API. Returns `status`: SUCCESS (lat/lng provided), USER_DENIED (user rejected the prompt — ask for their city name instead), TIMEOUT (user ignored prompt — ask for city), or SYSTEM_ERROR. Use this when the user asks about weather, local time, or location-specific information but does NOT mention a city name. If status is USER_DENIED or TIMEOUT, gracefully ask "Which city are you in?" — never show a technical error.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
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
			name: 'replaceSelection',
			description:
				'Replace the text currently selected (highlighted) by the user with new text. Use this immediately after the user asks to rewrite, polish, or fix "this" or "the selected text". Always pair with getSelection to read the selection first.',
			parameters: {
				type: 'object',
				properties: {
					text: { type: 'string', description: 'The new text to replace the selection with.' }
				},
				required: ['text']
			}
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
				'Precisely replace a specific substring in the document. Finds the first occurrence of searchText and replaces it with newText. CRITICAL: searchText must be unique and include enough surrounding context (a full phrase or clause) so it does not accidentally match a common word elsewhere.',
			parameters: {
				type: 'object',
				properties: {
					searchText: {
						type: 'string',
						description:
							'The exact unique phrase to find and replace. Include surrounding context to avoid false matches.'
					},
					newText: { type: 'string', description: 'The replacement text.' }
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
	},
	{
		type: 'function',
		function: {
			name: 'replaceFullDocument',
			description:
				'Replace the entire document content. Use only for complete rewrites, major structural overhauls, or full document polishing. Do not pass empty text.',
			parameters: {
				type: 'object',
				properties: {
					text: {
						type: 'string',
						description: 'The complete new markdown content for the entire document.'
					}
				},
				required: ['text']
			}
		}
	}
];
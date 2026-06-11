import type { APIRoutes } from '$lib/types';
import { db, sys } from '../index';
import { auth } from './_common';
import { resp, getClient } from '../utils';
import { permission } from '$lib/enum';
import { randomBytes } from 'node:crypto';

const { Admin } = permission;

/** Generate a short unique memory identifier like "A1B-C2D3-E4F5". */
function genMemoryId(): string {
	const b = randomBytes(5);
	const hex = b.toString('hex').toUpperCase();
	return hex.slice(0, 3) + '-' + hex.slice(3, 7) + '-' + hex.slice(7, 10);
}

// ── Retry wrapper for transient API errors (429 / 500 / 503) ────────
async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries = 2
): Promise<Response> {
	for (let i = 0; i <= maxRetries; i++) {
		const response = await fetch(url, options);
		if (response.ok) return response;
		if (i === maxRetries) return response;
		if ([429, 500, 503].includes(response.status)) {
			const delay = Math.min(1000 * 2 ** i, 8000);
			console.warn(
				`[AI] retry ${i + 1}/${maxRetries} after ${response.status}, waiting ${delay}ms`
			);
			await new Promise((r) => setTimeout(r, delay));
			continue;
		}
		return response; // Non-retryable, return immediately
	}
}

// ── Balance cache — avoids calling /user/balance on every AI request ─
const balanceCache = new Map<string, { is_available: boolean; ts: number }>();
const BALANCE_CACHE_TTL = 300_000; // 5 minutes

async function checkBalance(apiKey: string): Promise<{ ok: boolean; message?: string }> {
	const now = Date.now();
	const cached = balanceCache.get(apiKey);
	if (cached && cached.ts > now - BALANCE_CACHE_TTL) {
		return {
			ok: cached.is_available,
			message: cached.is_available
				? undefined
				: 'Account balance insufficient. Please top up at https://platform.deepseek.com.'
		};
	}
	try {
		const res = await fetch('https://api.deepseek.com/user/balance', {
			headers: { Authorization: `Bearer ${apiKey}` }
		});
		if (!res.ok) return { ok: true }; // Can't check — proceed anyway
		const data = (await res.json()) as { is_available: boolean };
		balanceCache.set(apiKey, { is_available: data.is_available, ts: now });
		if (!data.is_available) console.warn('[AI] balance check → INSUFFICIENT');
		return {
			ok: data.is_available,
			message: data.is_available
				? undefined
				: 'Account balance insufficient. Please top up at https://platform.deepseek.com.'
		};
	} catch {
		return { ok: true }; // Network error — proceed anyway
	}
}

// ── Smart model routing — classifies task complexity to pick ──────
//     flash (fast/cheap) vs pro (deep reasoning) automatically.

const MODEL_MATRIX = {
	flash: 'deepseek-v4-flash',
	pro: 'deepseek-v4-pro'
};

function getSmartModel(messages: Array<{ role: string; content?: string }>): string {
	// Extract the last user message for classification
	let userPrompt = '';
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') {
			userPrompt = messages[i].content || '';
			break;
		}
	}

	const text = userPrompt.trim();
	const len = text.length;

	// Long-form content → needs deep reasoning
	if (len > 1000) {
		console.log('[AI] smart route → pro', { reason: 'length>1000', len });
		return MODEL_MATRIX.pro;
	}

	// Light editorial tasks → flash is enough
	const lightPatterns = [
		/纠错/,
		/错别字/,
		/拼写/,
		/typo/i,
		/起标题/,
		/取个名/,
		/标题建议/,
		/翻译/,
		/英文/,
		/日文/,
		/translate/i,
		/精简/,
		/缩写/,
		/summarize/i,
		/加个标点/,
		/分行/,
		/排版/,
		/hello/i,
		/hi\b/i,
		/你好/,
		/谢谢/
	];
	const lightMatch = lightPatterns.find((r) => r.test(text));
	if (lightMatch) {
		console.log('[AI] smart route → flash', {
			reason: 'light_task',
			pattern: lightMatch.toString()
		});
		return MODEL_MATRIX.flash;
	}

	// Deep creative / analytical tasks → pro
	const heavyPatterns = [
		/写一篇/,
		/大纲/,
		/论文/,
		/深度分析/,
		/代码/,
		/重构/,
		/架构/,
		/review/i,
		/润色全文/,
		/全文/,
		/整篇/,
		/逻辑/,
		/论点/,
		/论证/
	];
	const heavyMatch = heavyPatterns.find((r) => r.test(text));
	if (heavyMatch) {
		console.log('[AI] smart route → pro', { reason: 'heavy_task', pattern: heavyMatch.toString() });
		return MODEL_MATRIX.pro;
	}

	// Default: ambiguous chat → flash (cost-effective)
	const chosen = MODEL_MATRIX.flash;
	console.log('[AI] smart route →', chosen, {
		reason: 'default',
		len: text.length,
		preview: text.slice(0, 80)
	});
	return chosen;
}

// ── Smart article sampling ────────────────────────────────────
// Full-pool sampling with tag coverage guarantee + time-interval random selection.
// 1. Each requested tag gets at least 1 article (tag guarantee)
// 2. Remaining slots are filled via time-interval random selection
// 3. Content length < MIN_CONTENT is filtered out
const MIN_CONTENT_LEN = 200;

function smartArticleSample(
	pool: Record<string, unknown>[],
	tagPools: Map<string, Record<string, unknown>[]>,
	count: number
): Record<string, unknown>[] {
	// Filter short articles
	pool = pool.filter((r) => (String(r.content ?? '')).length >= MIN_CONTENT_LEN);

	if (pool.length <= count) return pool;

	const picked = new Map<number, Record<string, unknown>>();

	// Step 1 — Tag guarantee: one article per tag (random within tag)
	if (tagPools.size > 0) {
		// Sort tags by article count descending; if tag count > count, only top N tags get a slot
		const sortedTags = [...tagPools.entries()].sort(
			(a, b) => b[1].length - a[1].length
		);
		const guaranteeSlots = Math.min(sortedTags.length, count);

		for (let i = 0; i < guaranteeSlots; i++) {
			const [, articles] = sortedTags[i];
			const eligible = articles.filter(
				(r) =>
					(String(r.content ?? '')).length >= MIN_CONTENT_LEN &&
					!picked.has(r.id as number)
			);
			if (eligible.length > 0) {
				const pick = eligible[Math.floor(Math.random() * eligible.length)];
				picked.set(pick.id as number, pick);
			}
		}
	}

	// Step 2 — If we already have enough, return random subset
	if (picked.size >= count) {
		const arr = [...picked.values()];
		// Fisher-Yates shuffle and slice
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr.slice(0, count);
	}

	const remaining = count - picked.size;

	// Step 3 — Build remaining pool (chronological, excluding already picked)
	const rest = pool.filter((r) => !picked.has(r.id as number));

	if (rest.length <= remaining) {
		return [...picked.values(), ...rest];
	}

	// Step 4 — Year-based proportional allocation + random within each year
	// Group by year, allocate slots proportional to article count per year,
	// then randomly pick within each year segment.
	const byYear = new Map<number, Record<string, unknown>[]>();
	for (const r of rest) {
		const year = new Date(r.createAt as number).getFullYear();
		const bucket = byYear.get(year);
		if (bucket) bucket.push(r);
		else byYear.set(year, [r]);
	}

	const years = [...byYear.keys()].sort();
	const totalArticles = rest.length;

	// Each year with articles gets at least 1 slot (if enough remaining),
	// then extra slots are distributed proportionally by article count.
	const yearCount = years.length;
	const guaranteed = remaining >= yearCount ? 1 : 0;
	const extraSlots = remaining - (guaranteed ? yearCount : 0);

	const alloc: { year: number; quota: number; articles: Record<string, unknown>[] }[] = [];
	let allocated = 0;
	const remainders: { year: number; rem: number }[] = [];

	for (const year of years) {
		const articles = byYear.get(year)!;
		const raw = guaranteed
			? 1 + (articles.length / totalArticles) * extraSlots
			: (articles.length / totalArticles) * remaining;
		let floor = Math.floor(raw);
		// In guaranteed mode, never give a year zero if it has articles
		if (guaranteed && floor < 1 && articles.length > 0 && remaining >= yearCount) {
			floor = 1;
		}
		alloc.push({ year, quota: floor, articles });
		if (floor > 0) allocated += floor;
		remainders.push({ year, rem: raw - floor });
	}

	// Distribute leftover slots by largest remainder
	const needed = remaining - allocated;
	if (needed > 0) {
		remainders.sort((a, b) => b.rem - a.rem);
		for (let i = 0; i < needed; i++) {
			const entry = alloc.find((a) => a.year === remainders[i].year);
			if (entry) {
				entry.quota++;
				allocated++;
			}
		}
	}

	// Random pick within each year segment
	for (const { year, quota, articles } of alloc) {
		if (quota <= 0) continue;
		const take = Math.min(quota, articles.length);
		// Fisher-Yates shuffle to pick random subset
		const pool = [...articles];
		for (let i = 0; i < take; i++) {
			const j = i + Math.floor(Math.random() * (pool.length - i));
			[pool[i], pool[j]] = [pool[j], pool[i]];
			picked.set(pool[i].id as number, pool[i]);
		}
	}

	const final = [...picked.values()].sort(
		(a, b) => (a.createAt as number) - (b.createAt as number)
	);

	console.log('[AI] smartSample →', {
		poolSize: rest.length + picked.size,
		byYear: Object.fromEntries([...byYear].map(([y, a]) => [y, a.length])),
		alloc: Object.fromEntries(alloc.map((a) => [a.year, a.quota])),
		selected: final.map((r) => ({ title: r.title, year: new Date(r.createAt as number).getFullYear() }))
	});
	return final;
}

/** Parse comma-separated GROUP_CONCAT tag names */
function parseTagNames(row: Record<string, unknown>): string[] {
	const raw = row.tagNames as string | undefined;
	if (!raw) return [];
	return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

const apis: APIRoutes = {
	ai: {
		post: auth(Admin, async (req) => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return resp('AI API key not configured', 500);

			const {
				messages,
				tools,
				model,
				stream = false,
				thinking,
				reasoning_effort
			} = await req.json();
			// Three-tier model routing:
			//   T1 — user explicitly picked a model in the dropdown
			//   T2 — admin set a specific default in Settings
			//   T3 — auto: classify the prompt and route to flash or pro
			const adminModel = (sys.aiModel as string)?.trim();
			const selectedModel =
				model && model !== '' ? model : adminModel ? adminModel : getSmartModel(messages);

			const body: Record<string, unknown> = {
				model: selectedModel,
				messages,
				stream
			};
			if (tools?.length) {
				body.tools = tools;
				body.tool_choice = 'auto';
			}
			if (thinking) body.thinking = thinking;
			if (reasoning_effort && thinking?.type === 'enabled') {
				body.reasoning_effort = reasoning_effort;
			}

			// Pre-check balance to avoid wasted API calls (402)
			const bal = await checkBalance(apiKey);
			if (!bal.ok) return resp(bal.message || 'Insufficient balance', 402);

			// Attach user_id for KVCache / scheduling isolation
			const client = getClient(req);
			if (client?.uuid) {
				body.user_id = client.uuid;
			}

			console.log('[AI] request →', {
				model: selectedModel,
				stream,
				msgCount: messages.length,
				hasTools: !!tools?.length,
				thinking: thinking?.type
			});

			const response = await fetchWithRetry('https://api.deepseek.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const err = await response.clone().text().catch(() => '');
				console.error('[AI] API error →', response.status, err);
				let detail = err;
				try { detail = JSON.stringify(JSON.parse(err)); } catch { /* keep raw */ }
				// Return structured error so the frontend can show a useful message
				return resp({
					error: 'AI_API_ERROR',
					message: `DeepSeek API returned HTTP ${response.status}`,
					detail: String(detail).slice(0, 2000),
					model: selectedModel,
					operation: 'chat_completion',
					msgCount: messages.length,
					hasTools: !!tools?.length,
					// Extract last user message for context (truncated)
					lastUserMsg: (() => {
						const last = [...messages].reverse().find(m => m.role === 'user');
						return String(last?.content || '').slice(0, 200);
					})()
				}, response.status);
			}

			if (stream) {
				return new Response(response.body, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive'
					}
				});
			}

			// Use text() first so we can safely inspect the body on parse failure
			const responseText = await response.text();
			let data: Record<string, unknown>;
			try {
				data = JSON.parse(responseText);
			} catch (parseErr) {
				console.error('[AI] JSON parse error →', {
					model: selectedModel,
					bodyPreview: responseText.slice(0, 500),
					bodyLen: responseText.length,
					error: String(parseErr)
				});
				return resp({
					error: 'AI_JSON_PARSE_ERROR',
					message: 'DeepSeek API returned a non-JSON response (possibly an empty body, truncated stream, or proxy error page).',
					model: selectedModel,
					operation: 'parse_response',
					bodyPreview: responseText.slice(0, 500),
					bodyLength: responseText.length,
					parseError: String(parseErr),
					lastUserMsg: (() => {
						const last = [...messages].reverse().find(m => m.role === 'user');
						return String(last?.content || '').slice(0, 200);
					})()
				}, 502);
			}

			// Guard against empty-but-valid JSON (e.g. empty string parsed as "")
			if (!data || (typeof data === 'object' && !data.choices)) {
				console.error('[AI] unexpected response shape →', JSON.stringify(data).slice(0, 500));
			}
			const choice = data?.choices?.[0];
			const usage = data?.usage;
			console.log('[AI] response ←', {
				finish_reason: choice?.finish_reason,
				hasContent: !!choice?.message?.content,
				contentLen: choice?.message?.content?.length,
				hasReasoning: !!choice?.message?.reasoning_content,
				toolCalls: choice?.message?.tool_calls
					? (choice.message.tool_calls as Array<{ function?: { name?: string } }>).map(
							(tc) => tc.function?.name
						)
					: null,
				tokens: usage
					? {
							prompt: usage.prompt_tokens,
							completion: usage.completion_tokens,
							total: usage.total_tokens
						}
					: null
			});
			return data;
		})
	},
	aiValidate: {
		get: auth(Admin, async () => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return { valid: false, error: 'API key not configured' };

			try {
				const response = await fetchWithRetry('https://api.deepseek.com/v1/models', {
					headers: { Authorization: `Bearer ${apiKey}` }
				});
				if (response.ok) return { valid: true };
				const err = await response.text();
				return { valid: false, error: err };
			} catch (e) {
				return { valid: false, error: String(e) };
			}
		})
	},
	aiModels: {
		get: auth(Admin, async () => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return resp('AI API key not configured', 500);

			const response = await fetch('https://api.deepseek.com/v1/models', {
				headers: { Authorization: `Bearer ${apiKey}` }
			});

			if (!response.ok) {
				const err = await response.text();
				return resp(`Failed to list models: ${err}`, response.status);
			}

			return response.json();
		})
	},
	// ── Balance ─────────────────────────────────────────────────────
	aiBalance: {
		get: auth(Admin, async () => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return resp('AI API key not configured', 500);

			const response = await fetch('https://api.deepseek.com/user/balance', {
				headers: { Authorization: `Bearer ${apiKey}` }
			});

			if (!response.ok) {
				const err = await response.text();
				return resp(`Failed to fetch balance: ${err}`, response.status);
			}

			return response.json();
		})
	},
	// ── Memory ──────────────────────────────────────────────────────
	aiMemory: {
		get: auth(Admin, async () => {
			const enabled = sys.aiMemoryEnabled;
			const raw = (sys.aiMemory as string) || '{}';
			const rawTags = (sys.aiMemoryTags as string) || '';
			const tags = rawTags
				? rawTags
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean)
				: [];
			const limit = Number(sys.aiMemoryLimit) || 10;
			let memory: Record<string, unknown>;
			try {
				memory = JSON.parse(raw);
			} catch {
				memory = {};
			}

			// Auto-initialize empty memory with a template structure
			if (enabled && !memory.persona && !memory.style) {
				memory = {
					memoryId:      '',
					persona:       { role: '', tone: '', readers: '' },
					persona_zh:    { role: '', tone: '', readers: '' },
					style:         { language: '', preferences: [], avoid: [] },
					style_zh:      { language: '', preferences: [], avoid: [] },
					knowledge:     [],
					knowledge_zh:  [],
					structure:     {},
					structure_zh:  {},
					patterns:      [],
					patterns_zh:   [],
					lastUpdated:   null
				};
				sys.aiMemory = JSON.stringify(memory);
			}

			const initialized = !!(
				(memory.persona as Record<string, unknown>)?.role ||
				(memory.style as Record<string, unknown>)?.language ||
				(memory.knowledge as unknown[])?.length
			);

			const consumed = Number(memory._readsConsumed) || 0;
			console.log('[AI] memory read ←', {
				enabled: !!enabled,
				initialized,
				consumed,
				limit,
				remaining: Math.max(0, limit - consumed),
				tags
			});

			return {
				enabled: !!enabled,
				initialized,
				limit,
				consumed,
				remaining: Math.max(0, limit - consumed),
				tags,
				tagsHint: tags.length
					? `Analyze articles only from these tags: ${tags.join(', ')}. Do not use articles outside these tags.`
					: 'No tag restriction — you may choose any tag for analyzeWritingStyle.',
				memory
			};
		}),
		put: auth(Admin, async (req) => {
			const { memory } = await req.json();
			if (!memory) return { ok: true, saved: false };
			console.log('[AI] memory save →', {
				persona: (memory as Record<string, unknown>)?.persona,
				style: ((memory as Record<string, unknown>)?.style as Record<string, unknown>)?.language,
				knowledgeCount: ((memory as Record<string, unknown>)?.knowledge as unknown[])?.length
			});
			// Stamp lastUpdated on save
			memory.lastUpdated = Date.now();
			sys.aiMemory = JSON.stringify(memory);
			return { ok: true };
		})
	},
	// ── One-click memory learning ─────────────────────────────────
	aiMemoryLearn: {
		post: auth(Admin, async () => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return resp('AI API key not configured', 500);

			const enabled = sys.aiMemoryEnabled;
			if (!enabled) return resp('Memory is not enabled', 400);

			const rawTags = (sys.aiMemoryTags as string) || '';
			const tags = rawTags
				? rawTags
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean)
				: [];
			const limit = Number(sys.aiMemoryLimit) || 10;

			// 1. Query article pool
			const targetCount = Math.min(5, limit);
			let pool: Record<string, unknown>[];
			const tagPools = new Map<string, Record<string, unknown>[]>();

			if (tags.length) {
				const placeholders = tags.map(() => '?').join(',');
				const rows = db.db
					.prepare(
						`SELECT p.id, p.title, p.content, p.createAt, p.slug, GROUP_CONCAT(t.name) AS tagNames
						 FROM Post p
						 INNER JOIN PostTag tp ON p.id = tp.postId
						 INNER JOIN Tag t ON t.id = tp.tagId
						 WHERE p.published = 1 AND t.name IN (${placeholders})
						 GROUP BY p.id
						 ORDER BY p.createAt ASC`
					)
					.all(...tags) as (Record<string, unknown> & { tagNames: string })[];
				pool = rows;

				// Build per-tag pools for tag-guarantee sampling
				for (const tag of tags) {
					const articles = rows.filter((r) => parseTagNames(r).includes(tag));
					if (articles.length > 0) tagPools.set(tag, articles);
				}
			} else {
				pool = db.db
					.prepare(
						`SELECT id, title, content, createAt, slug
						 FROM Post
						 WHERE published = 1
						 ORDER BY createAt ASC`
					)
					.all() as Record<string, unknown>[];
			}

			if (!pool.length) {
				return resp('No published articles found. Publish some posts first.', 400);
			}

			const sample = smartArticleSample(pool, tagPools, targetCount);
			const model = getSmartModel([{ role: 'user', content: 'memory learn' }]);

			// 2. Fire-and-forget: kick off AI call in background, return immediately.
			//    The frontend polls checkMemoryStatus() to detect completion.
			(async () => {
				try {
					const articlesBlock = sample
						.map(
							(r, i) =>
								'### Article ' +
								(i + 1) +
								': ' +
								r.title +
								'\n' +
								((r.content as string)?.slice(0, 10000) || '')
						)
						.join('\n\n---\n\n');

					const response = await fetchWithRetry('https://api.deepseek.com/v1/chat/completions', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: 'Bearer ' + apiKey
						},
						body: JSON.stringify({
							model,
							messages: [
								{
									role: 'system',
									content:
										"You are analyzing an author's writing style from their published blog articles. Extract persona, style, knowledge, writing structure, and signature sentence patterns.\n\nCRITICAL language rule: Fields WITHOUT \"_zh\" suffix (persona, style, knowledge, structure, patterns) MUST be written in English. Fields WITH \"_zh\" suffix (persona_zh, style_zh, knowledge_zh, structure_zh, patterns_zh) MUST be written in Chinese. Every string value in English fields — including preferences[], avoid[], area, desc, paragraphStyle, typicalLength, patterns[] — MUST be English. zh fields MUST be Chinese. Never mix.\n\nIMPORTANT:\n- persona (role, tone, readers): 2-5 words max, badge-style labels. English: Title Case. Chinese: concise.\n- style.preferences: 3-5 concrete writing habits (e.g. \"Short paragraphs\", \"Code-first\", \"Progressive argumentation\")\n- style.avoid: 2-4 things the author never/rarely does\n- style.language: output in the SAME language as the field version — English field gets English name (\"Simplified Chinese\"), Chinese field gets Chinese name (\"简体中文\")\n- knowledge: 5-10 items covering all major topics found in the articles. \"expert\" for frequently/depth-covered topics, \"familiar\" for occasionally mentioned topics\n- structure: infer paragraph length, article length, and formatting habits from the corpus as a whole\n- patterns: 3-5 most distinctive sentence templates or rhetorical devices the author repeats\n\nOutput ONLY valid JSON."
								},
								{
									role: 'user',
									content:
										'Analyze the following ' +
										sample.length +
										' articles. Return a JSON object with both Chinese (zh) and English (en) versions.\nIMPORTANT for knowledge: output 5-10 items covering all major topics.\n\n' +
										'- persona: { role, tone, readers }  ← English\n' +
										'- persona_zh: { role, tone, readers }  ← Chinese\n' +
										'- style: { language, preferences[], avoid[] }  ← English\n' +
										'- style_zh: { language, preferences[], avoid[] }  ← Chinese\n' +
										'- knowledge: [{ area: string, level: \"expert\"|\"familiar\", desc: string }]  ← English\n' +
										'- knowledge_zh: [{ area: string, level: \"expert\"|\"familiar\", desc: string }]  ← Chinese\n' +
										'- structure: { paragraphStyle: string, typicalLength: string, usesCodeBlocks: boolean, usesEmoji: boolean, usesBulletPoints: boolean }  ← English\n' +
										'- structure_zh: { paragraphStyle: string, typicalLength: string, usesCodeBlocks: boolean, usesEmoji: boolean, usesBulletPoints: boolean }  ← Chinese\n' +
										'- patterns: string[]  ← English (3-5 high-frequency sentence templates)\n' +
										'- patterns_zh: string[]  ← Chinese\n\n' +
										'Notes: NEVER mix languages — English fields (no _zh) use English, Chinese fields (with _zh) use Chinese. Chinese field descriptions should be authentic translations, not literal word-for-word. For each knowledge item, \"area\" is a short label (e.g. \"SvelteKit\"), \"desc\" is a natural one-line description (English fields: \"Full-stack framework with SSR/CSR hybrid rendering\" — max 20 words. Chinese fields: \"全栈框架，SSR/CSR 混合渲染\"). For structure, paragraphStyle is \"short\"|\"mixed\"|\"long\"; typicalLength describes the word/character count range.\n\n' +
										'Articles:\n' +
										articlesBlock +
										'\n\nRespond with ONLY the JSON object, no markdown, no explanation.'
								}
							],
							response_format: { type: 'json_object' },
							max_tokens: 4096,
							stream: false
						})
					});

					if (!response.ok) {
						const err = await response.text();
						console.error('[AI] memoryLearn bg error →', response.status, err);
						return;
					}

					const data = (await response.json()) as {
						choices?: Array<{ message?: { content?: string } }>;
					};
					const raw = data?.choices?.[0]?.message?.content;
					if (!raw) {
						console.error('[AI] memoryLearn bg empty response');
						return;
					}

					let parsed: Record<string, unknown>;
					try {
						parsed = JSON.parse(raw);
					} catch {
						console.error('[AI] memoryLearn bg parse → invalid JSON:', raw.slice(0, 200));
						return;
					}

					const memory = {
						memoryId:        genMemoryId(),
						persona:         parsed.persona || {},
						persona_zh:      parsed.persona_zh || parsed.persona || {},
						style:           parsed.style || {},
						style_zh:        parsed.style_zh || parsed.style || {},
						knowledge:       parsed.knowledge || [],
						knowledge_zh:    parsed.knowledge_zh || parsed.knowledge || [],
						structure:       parsed.structure || {},
						structure_zh:    parsed.structure_zh || parsed.structure || {},
						patterns:        parsed.patterns || [],
						patterns_zh:     parsed.patterns_zh || parsed.patterns || [],
						lastUpdated:     Date.now(),
						_readsConsumed:  targetCount
					};
					sys.aiMemory = JSON.stringify(memory);

					console.log('[AI] memoryLearn done →', {
						articles: sample.map((r) => ({
							id: r.id,
							title: r.title,
							date: new Date(r.createAt as number).toISOString().slice(0, 10)
						})),
						result: { persona: memory.persona, style: memory.style, knowledge: memory.knowledge }
					});
				} catch (e) {
					console.error('[AI] memoryLearn bg exception →', e);
				}
			})();

			console.log('[AI] memoryLearn started →', {
				model,
				articleCount: sample.length,
				tags: tags.length ? tags : 'all'
			});
			return { ok: true, learning: true };
		})
	},

	// ── HTTP fetch proxy for AI tools ──────────────────────────────
	aiFetch: {
		post: auth(Admin, async (req) => {
			const {
				url,
				method = 'GET',
				headers = {},
				body: reqBody
			} = (await req.json()) as {
				url: string;
				method?: string;
				headers?: Record<string, string>;
				body?: string;
			};

			if (!url) return resp('url is required', 400);

			// Block internal / private network access
			const parsed = (() => {
				try {
					return new URL(url);
				} catch {
					return null;
				}
			})();
			if (!parsed) return resp('Invalid URL', 400);
			if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname)) {
				return resp('Internal URLs are not allowed', 403);
			}
			const allowedMethods = new Set(['GET', 'POST']);
			const m = allowedMethods.has(method.toUpperCase()) ? method.toUpperCase() : 'GET';

			try {
				const fetchHeaders: Record<string, string> = {};
				for (const [k, v] of Object.entries(headers)) {
					// Block dangerous headers
					const kl = k.toLowerCase();
					if (['host', 'cookie', 'authorization', 'proxy-authorization'].includes(kl)) continue;
					fetchHeaders[k] = String(v);
				}

				const fetchOpts: RequestInit = {
					method: m,
					headers: fetchHeaders
				};
				if (m === 'POST' && reqBody) {
					fetchOpts.body = reqBody;
				}

				console.log('[AI] fetchUrl →', { url, method: m });

				const res = await fetch(url, fetchOpts);
				const ct = res.headers.get('content-type') || '';
				const isText =
					ct.includes('text') ||
					ct.includes('json') ||
					ct.includes('xml') ||
					ct.includes('javascript');
				let body = '';
				if (isText) {
					body = await res.text();
					if (body.length > 8192) body = body.slice(0, 8192) + '…(truncated)';
				} else {
					body = `[binary: ${ct}, ${res.headers.get('content-length') || 'unknown'} bytes]`;
				}

				console.log('[AI] fetchUrl ←', { status: res.status, bodyLen: body.length });

				return {
					ok: res.ok,
					status: res.status,
					statusText: res.statusText,
					contentType: ct,
					body
				};
			} catch (e) {
				return { ok: false, status: 0, statusText: 'Network error', error: String(e) };
			}
		})
	},

	// ── Article style analysis ──────────────────────────────────────
	aiAnalyzeStyle: {
		post: auth(Admin, async (req) => {
			const { tag, tags, count = 5 } = await req.json();
			// Use tags array if provided, otherwise fall back to single tag
			const filterTags: string[] = tags?.length ? tags : tag ? [tag] : [];

			// Enforce memory read limit
			const limit = Number(sys.aiMemoryLimit) || 10;
			const rawMem = (sys.aiMemory as string) || '{}';
			let mem: Record<string, unknown>;
			try {
				mem = JSON.parse(rawMem);
			} catch {
				mem = {};
			}
			const consumed = Number(mem._readsConsumed) || 0;
			const remaining = Math.max(0, limit - consumed);
			const effectiveCount = Math.min(count, remaining);

			if (effectiveCount <= 0) {
				console.warn('[AI] analyzeStyle blocked →', {
					reason: 'limit_reached',
					consumed,
					limit,
					requested: count
				});
				return {
					ok: false,
					error: `Memory read limit reached (${consumed}/${limit}). Use the "Regenerate" button in Settings to reset.`
				};
			}

			// Fetch pool & apply smart sampling (full pool, tag guarantee, interval random)
			let pool: Record<string, unknown>[];
			const tagPools = new Map<string, Record<string, unknown>[]>();

			if (filterTags.length) {
				const placeholders = filterTags.map(() => '?').join(',');
				const rows = db.db
					.prepare(
						`SELECT p.id, p.title, p.content, p.createAt, p.slug, GROUP_CONCAT(t.name) AS tagNames
						 FROM Post p
						 INNER JOIN PostTag tp ON p.id = tp.postId
						 INNER JOIN Tag t ON t.id = tp.tagId
						 WHERE p.published = 1 AND t.name IN (${placeholders})
						 GROUP BY p.id
						 ORDER BY p.createAt ASC`
					)
					.all(...filterTags) as (Record<string, unknown> & { tagNames: string })[];
				pool = rows;

				// Build per-tag pools for tag-guarantee sampling
				for (const tag of filterTags) {
					const articles = rows.filter((r) => parseTagNames(r).includes(tag));
					if (articles.length > 0) tagPools.set(tag, articles);
				}
			} else {
				pool = db.db
					.prepare(
						`SELECT id, title, content, createAt, slug
						 FROM Post
						 WHERE published = 1
						 ORDER BY createAt ASC`
					)
					.all() as Record<string, unknown>[];
			}

			if (!pool.length) {
				console.warn('[AI] analyzeStyle empty →', {
					tags: filterTags,
					published: true
				});
				return {
					ok: false,
					error: tag
						? `No published articles found with tag "${tag}"`
						: 'No published articles found'
				};
			}

			const sample = smartArticleSample(pool, tagPools, effectiveCount);
			const articles = sample.map((r) => ({
				title: r.title,
				slug: r.slug,
				// Return full content for style learning — AI needs the raw text
				content: r.content,
				contentLength: String(r.content ?? '').length
			}));

			// Track consumed reads
			mem._readsConsumed = consumed + articles.length;
			sys.aiMemory = JSON.stringify(mem);
			console.log('[AI] analyzeStyle done →', {
				tags: filterTags.length ? filterTags : 'all',
				requested: count,
				returned: articles.length,
				consumed: mem._readsConsumed,
				limit,
				articles: articles.map((a) => ({ title: a.title, len: a.contentLength }))
			});

			return {
				ok: true,
				count: articles.length,
				consumed: mem._readsConsumed,
				limit,
				remaining: Math.max(0, limit - consumed),
				hint: `You have read ${consumed}/${limit} articles total. ${Math.max(0, limit - consumed)} reads remaining. Learn the author's writing style and save findings via aiMemory PUT.`,
				articles
			};
		})
	}
};

export default apis;
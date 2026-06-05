import type { APIRoutes } from '../../types';
import { sys } from '../index';
import { auth } from './_common';
import { resp } from '../utils';
import { permission } from '$lib/enum';

const { Admin } = permission;

const apis: APIRoutes = {
	ai: {
		post: auth(Admin, async (req) => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return resp('AI API key not configured', 500);

			const { messages, tools, model, stream = false } = await req.json();
			const selectedModel = model || (sys.aiModel as string) || 'deepseek-chat';

			const body: Record<string, unknown> = {
				model: selectedModel,
				messages,
				stream,
			};
			if (tools?.length) {
				body.tools = tools;
				body.tool_choice = 'auto';
			}

			console.log('[AI] request →', { model: selectedModel, stream, msgCount: messages.length, hasTools: !!tools?.length });

			const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const err = await response.text();
				console.error('[AI] API error →', response.status, err);
				return resp(`DeepSeek API error: ${err}`, response.status);
			}

			if (stream) {
				// Proxy the SSE stream directly back to the client
				return new Response(response.body, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
					},
				});
			}

			// Non-streaming: parse JSON and return
			const data = await response.json();
			const choice = data?.choices?.[0];
			console.log('[AI] response ←', {
				finish_reason: choice?.finish_reason,
				hasContent: !!choice?.message?.content,
				contentLen: choice?.message?.content?.length,
				hasToolCalls: !!choice?.message?.tool_calls,
			});
			return data;
		}),
	},
	aiValidate: {
		get: auth(Admin, async () => {
			const apiKey = sys.aiApiKey as string;
			if (!apiKey) return { valid: false, error: 'API key not configured' };

			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 10_000);

				const response = await fetch('https://api.deepseek.com/v1/models', {
					headers: { Authorization: `Bearer ${apiKey}` },
					signal: controller.signal,
				});
				clearTimeout(timeout);

				if (response.ok) return { valid: true };
				const err = await response.text();
				return { valid: false, error: err };
			} catch (e) {
				return { valid: false, error: String(e) };
			}
		}),
	},
};

export default apis;

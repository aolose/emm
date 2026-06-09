<script lang="ts">
	import { aiMessages, aiLoading, aiPending, availableModels, deepThink } from './store';
	import Switch from '$lib/components/Switch.svelte';
	import { sendAiMessage, type SendOptions } from './chat';
	import { getUserLocation, preloadLocation } from './location';
	import { editorTools } from '$lib/store';
	import { marked } from 'marked';
	import { get } from 'svelte/store';
	import { configureMarked } from '$lib/marked-config';
	import { req } from '$lib/req';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ToolCall } from './types';

	configureMarked();

	// Pre-fetch location on mount so AI tool calls return instantly
	preloadLocation();

	// ── Model list ─────────────────────────────────────────────────
	let selectedModel = $state(''); // '' means auto
	let fetchingModels = $state(false);
	let modelFetchPromise: Promise<void> | null = $state(null);

	async function fetchModels() {
		if (fetchingModels) return;
		fetchingModels = true;
		modelFetchPromise = (async () => {
			try {
				const data = (await req('aiModels', undefined, { method: 1 as never })) as {
					data?: Array<{ id: string; owned_by: string }>;
				};
				if (data?.data) availableModels.set(data.data);
			} catch {
				/* ignore */
			} finally {
				fetchingModels = false;
				modelFetchPromise = null;
			}
		})();
		await modelFetchPromise;
	}

	// Fetch on mount
	fetchModels();

	function modelOptions() {
		const models = get(availableModels);
		return [{ id: '', label: 'Auto' }, ...models.map((m) => ({ id: m.id, label: m.id }))];
	}

	async function listModels() {
		const models = get(availableModels);
		if (!models.length) {
			// Avoid parallel duplicate calls — wait on existing fetch
			if (modelFetchPromise) await modelFetchPromise;
			else await fetchModels();
		}
		return {
			ok: true,
			models: get(availableModels).map((m) => ({ id: m.id, owned_by: m.owned_by })),
			hint: 'Use the model id in API calls. deepseek-v4-pro is best for complex tasks, deepseek-v4-flash is faster and cheaper.'
		};
	}

	async function getMemory() {
		try {
			const data = (await req('aiMemory', undefined, { method: 1 as never })) as {
				enabled: boolean;
				initialized: boolean;
				limit: number;
				consumed: number;
				remaining: number;
				tags: string[];
				tagsHint: string;
				memory: Record<string, unknown>;
			};
			if (!data?.enabled)
				return {
					ok: false,
					error: 'Memory is not enabled. Ask the user to enable it in Settings → AI.'
				};
			// Only expose persona/style/knowledge — keep internal fields (_readsConsumed) private
			const { persona, style, knowledge, lastUpdated } = data.memory;
			return { ok: true, persona, style, knowledge, lastUpdated };
		} catch (e) {
			return { ok: false, error: String(e) };
		}
	}

	async function fetchUrl(args?: {
		url?: string;
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	}) {
		if (!args?.url) return { ok: false, error: 'url is required' };
		try {
			const data = (await req('aiFetch', {
				url: args.url,
				method: args.method,
				headers: args.headers,
				body: args.body
			})) as {
				ok: boolean;
				status: number;
				statusText: string;
				contentType: string;
				body: string;
				error?: string;
			};
			return data;
		} catch (e) {
			return { ok: false, error: String(e) };
		}
	}

	async function saveMemory(args?: {
		persona?: Record<string, unknown>;
		style?: Record<string, unknown>;
		knowledge?: string[];
	}) {
		if (!args) return { ok: false, error: 'No memory data provided' };
		try {
			await req('aiMemory', { memory: args }, { method: 2 as never });
			return {
				ok: true,
				message: 'Memory saved. Your writing style is now remembered for all future sessions.'
			};
		} catch (e) {
			return { ok: false, error: String(e) };
		}
	}

	async function analyzeWritingStyle(args?: { tags?: string[]; count?: number }) {
		try {
			const data = (await req('aiAnalyzeStyle', { tags: args?.tags, count: args?.count || 5 })) as {
				ok: boolean;
				error?: string;
				count?: number;
				hint?: string;
				articles?: unknown[];
			};
			return data;
		} catch (e) {
			return { ok: false, error: String(e) };
		}
	}

	function initMermaid(root: HTMLElement) {
		// Only process blocks that haven't been rendered yet
		const blocks = root.querySelectorAll('pre.mermaid:not(.mermaid-rendered)');
		if (!blocks.length) return;
		import('mermaid').then((m) => {
			m.default.initialize({ startOnLoad: false, theme: 'dark', suppressErrorRendering: true });
			Array.from(blocks).forEach((b) => {
				b.classList.add('mermaid-rendered');
				m.default.run({ nodes: [b] }).catch(() => {});
			});
		});
	}

	let {
		close
	}: {
		close?: () => void;
	} = $props();

	let inputValue = $state('');
	let chatEl = $state<HTMLDivElement>();
	let copiedIdx = new SvelteSet<number>();
	let expandedReasoning = new SvelteSet<number>();

	// ── Smart scroll: MutationObserver keeps view at bottom ────────
	//     unless user explicitly scrolls up (wheel / touch / scroll).
	let isAtBottom = $state(true);
	let unreadCount = $state(0);
	let lastMsgCount = $state(0);
	const SCROLL_THRESHOLD = 60;
	let scrollObserver: MutationObserver | null = null;

	function scrollToBottom() {
		if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
	}

	function onChatScroll() {
		if (!chatEl) return;
		const dist = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight;
		const wasAtBottom = isAtBottom;
		isAtBottom = dist < SCROLL_THRESHOLD;
		if (isAtBottom && !wasAtBottom) unreadCount = 0;
	}

	// User-initiated scroll up (wheel or touch) — stop auto-follow
	function onUserScrollUp() {
		isAtBottom = false;
	}

	function scrollToBottomAndReset() {
		scrollToBottom();
		unreadCount = 0;
		isAtBottom = true;
	}

	// Watch DOM mutations — auto-scroll if user is at bottom
	function setupScrollObserver() {
		if (!chatEl) return;
		scrollObserver = new MutationObserver(() => {
			if (isAtBottom) scrollToBottom();
			// Track new messages for unread badge
			const msgs = get(aiMessages);
			if (msgs.length > lastMsgCount) {
				if (!isAtBottom) unreadCount += msgs.length - lastMsgCount;
				lastMsgCount = msgs.length;
			}
			initMermaid(chatEl!);
		});
		scrollObserver.observe(chatEl, { childList: true, subtree: true, characterData: true });
	}

	function teardownScrollObserver() {
		scrollObserver?.disconnect();
		scrollObserver = null;
	}

	// Setup / teardown when chatEl mounts
	$effect(() => {
		if (chatEl) setupScrollObserver();
		return () => teardownScrollObserver();
	});

	// ── Send ─────────────────────────────────────────────────────────
	async function handleSend() {
		const v = inputValue.trim();
		if (!v || $aiLoading) return;
		inputValue = '';
		scrollToBottomAndReset();
		const fns = {
			...get(editorTools),
			getUserLocation,
			listModels,
			getMemory,
			analyzeWritingStyle,
			saveMemory,
			fetchUrl
		};
		const opts: SendOptions = {};
		if (selectedModel) opts.model = selectedModel;
		opts.deepThink = get(deepThink);
		await sendAiMessage(v, fns, opts);
	}

	// Detect touch devices — disable Enter-send to avoid virtual-keyboard misfires
	const isTouchDevice =
		typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
			e.preventDefault();
			handleSend();
		}
	}

	function renderMarkdown(text: string): string {
		if (!text) return '';
		const html = marked.parse(text) as string;
		return html.replace(
			/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
			'<pre class="mermaid">$1</pre>'
		);
	}

	// ── Reasoning display ───────────────────────────────────────────
	const REASONING_PREVIEW = 150;

	function toggleReasoningIdx(i: number) {
		if (expandedReasoning.has(i)) expandedReasoning.delete(i);
		else expandedReasoning.add(i);
	}

	function reasoningIsExpanded(i: number, len: number): boolean {
		return len <= REASONING_PREVIEW || expandedReasoning.has(i);
	}

	function reasoningNeedsToggle(len: number): boolean {
		return len > REASONING_PREVIEW;
	}

	// ── Human-readable tool summaries ────────────────────────────────
	function toolSummary(tc: ToolCall): string {
		let args: Record<string, unknown> = {};
		try {
			args = JSON.parse(tc.function.arguments);
		} catch {
			/* keep empty */
		}
		const preview = (v: unknown, max = 60) => {
			const s = String(v ?? '');
			return s.length > max ? s.slice(0, max) + '…' : s;
		};

		switch (tc.function.name) {
			case 'replaceSelection':
				return `Replace selection with: ${preview(args.text)}`;
			case 'replaceCurrentLine':
				return `Replace current line with: ${preview(args.text)}`;
			case 'replaceCurrentParagraph':
				return `Replace current paragraph with: ${preview(args.text)}`;
			case 'replaceText':
				return `Replace "${preview(args.searchText, 30)}" → "${preview(args.newText, 30)}"`;
			case 'replaceFullDocument':
				return `Replace entire document (${String(args.text ?? '').length} chars)`;
			case 'insertAtCursor':
				return `Insert at cursor: ${preview(args.text)}`;
			case 'setTitle':
				return `Set title to: ${preview(args.title)}`;
			default:
				return `${tc.function.name}(${preview(tc.function.arguments, 40)})`;
		}
	}
</script>

<div class="ai-panel">
	<div class="ai-header">
		<span>AI Assistant</span>
		{#if close}
			<button class="icon i-close" onclick={close}></button>
		{/if}
	</div>
	<div
		class="chat"
		bind:this={chatEl}
		onscroll={onChatScroll}
		onwheel={onUserScrollUp}
		ontouchstart={onUserScrollUp}
	>
		{#if $aiMessages.length === 0}
			<div class="empty">
				<p>Ask AI to help with your writing.</p>
				<p class="hint">AI can read your document to provide better suggestions.</p>
			</div>
		{/if}
		{#each $aiMessages as msg, i (msg.tool_call_id || `${msg.role}-${i}-${(msg.content || '').slice(0, 20)}`)}
			{#if msg.role === 'user'}
				<div class="msg user">
					<div class="bubble">{msg.content}</div>
				</div>
			{:else if msg.role === 'assistant' && msg.tool_calls && !msg.content}
				<div class="msg assistant tool-call">
					<div class="assistant-body">
						{#if msg.reasoning_content}
							{@const rlen = msg.reasoning_content.length}
							<div class="reasoning">
								{#if reasoningIsExpanded(i, rlen)}
									{msg.reasoning_content}
									{#if reasoningNeedsToggle(rlen)}
										<button class="reasoning-toggle" onclick={() => toggleReasoningIdx(i)}
											>Show less</button
										>
									{/if}
								{:else}
									{msg.reasoning_content.slice(0, REASONING_PREVIEW)}…
									<button class="reasoning-toggle" onclick={() => toggleReasoningIdx(i)}
										>Show more</button
									>
								{/if}
							</div>
						{/if}
						<div class="bubble">Reading document...</div>
					</div>
				</div>
			{:else if msg.role === 'assistant' && msg.content}
				<div class="msg assistant">
					<div class="assistant-body">
						{#if msg.reasoning_content}
							{@const rlen = msg.reasoning_content.length}
							<div class="reasoning">
								{#if reasoningIsExpanded(i, rlen)}
									{msg.reasoning_content}
									{#if reasoningNeedsToggle(rlen)}
										<button class="reasoning-toggle" onclick={() => toggleReasoningIdx(i)}
											>Show less</button
										>
									{/if}
								{:else}
									{msg.reasoning_content.slice(0, REASONING_PREVIEW)}…
									<button class="reasoning-toggle" onclick={() => toggleReasoningIdx(i)}
										>Show more</button
									>
								{/if}
							</div>
						{/if}
						<div class="bubble">
							<div class="ai-bubble-content">
								{@html renderMarkdown(msg.content)}
							</div>
							<button
								class="insert-btn icon"
								class:i-ok={copiedIdx.has(i)}
								class:i-copy={!copiedIdx.has(i)}
								onclick={() => {
									navigator.clipboard.writeText(msg.content);
									copiedIdx.add(i);
									setTimeout(() => {
										copiedIdx.delete(i);
									}, 3000);
								}}
								title="Copy to clipboard"
							></button>
						</div>
					</div>
				</div>
			{:else if msg.role === 'tool'}
				<!-- Tool results hidden from UI -->
			{/if}
		{/each}
		{#if $aiLoading}
			<div class="msg assistant loading">
				<div class="bubble"><span class="dot">...</span></div>
			</div>
		{/if}
		{#if $aiPending}
			<div class="msg assistant">
				<div class="bubble pending">
					<p class="pending-label">AI wants to make the following changes:</p>
					<ul class="pending-changes">
						{#each $aiPending.tool_calls as tc}
							<li>{toolSummary(tc)}</li>
						{/each}
					</ul>
					<div class="pending-actions">
						<button class="apply-btn" onclick={() => $aiPending.resolve(true)}>Apply</button>
						<button class="dismiss-btn" onclick={() => $aiPending.resolve(false)}>Dismiss</button>
					</div>
				</div>
			</div>
		{/if}

		{#if !isAtBottom}
			<button class="scroll-bottom-btn" onclick={scrollToBottomAndReset}>
				↓ {unreadCount > 0 ? `${unreadCount} new` : 'Scroll to bottom'}
			</button>
		{/if}
	</div>

	<div class="input-area">
		<div class="input-row">
			<textarea
				bind:value={inputValue}
				onkeydown={handleKeydown}
				placeholder="Ask AI..."
				rows="2"
				disabled={$aiLoading}
			></textarea>
			<button
				title="send"
				class="icon i-pub"
				onclick={handleSend}
				disabled={$aiLoading || !inputValue.trim()}
			></button>
		</div>
		<div class="controls-row">
			<div class="model-group">
				<select bind:value={selectedModel}>
					{#each modelOptions() as opt (opt.id)}
						<option value={opt.id}>{opt.label}</option>
					{/each}
				</select>
				<button
					class="icon i-reload refresh-btn"
					title="Refresh model list"
					onclick={fetchModels}
					disabled={fetchingModels}
				></button>
			</div>
			<Switch
				bind:checked={$deepThink}
				disabled={$aiLoading}
				title="Deep Think — enables chain-of-thought reasoning (supported on V3.2+ models)"
			>
				Think
			</Switch>
		</div>
	</div>
</div>

<style lang="scss">
	@use '../../break' as *;

	.ai-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		background: var(--bg1);
		position: relative;
	}

	.ai-header {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 16px;
		flex-shrink: 0;
		position: relative;

		span {
			font-size: 16px;
			color: #8a9bb5;
		}

		button {
			position: absolute;
			right: 16px;
			top: 50%;
			transform: translateY(-50%);
			font-size: 18px;
			color: var(--darkgrey);
			background: none;
			border: none;
			cursor: pointer;

			&:hover {
				color: #c8d3ee;
			}
		}
	}

	.chat {
		flex: 1;
		overflow-y: auto;
		padding: 16px;

		&::-webkit-scrollbar-track {
			background: transparent;
		}

		&::-webkit-scrollbar-thumb {
			background: rgba(80, 100, 140, 0.3);
			border-radius: 3px;
		}
	}

	.empty {
		text-align: center;
		color: var(--darkgrey);
		padding: 40px 20px;

		p {
			margin: 8px 0;
			font-size: 15px;
		}

		.hint {
			font-size: 13px;
			opacity: 0.7;
		}
	}

	.msg {
		margin-bottom: 12px;
		display: flex;

		&.user {
			justify-content: flex-end;

			.bubble {
				background: rgba(64, 128, 255, 0.15);
			}
		}

		&.assistant {
			justify-content: flex-start;
			// Reserve space for the absolutely-positioned copy button
			padding-right: 40px;

			.bubble {
				background: rgba(255, 255, 255, 0.05);
			}
		}

		.assistant-body {
			display: flex;
			flex-direction: column;
			max-width: 85%;
		}

		&.loading .bubble {
			padding: 8px 16px;
		}
	}

	.bubble {
		position: relative; /* anchor for .insert-btn absolute positioning */
		max-width: 85%;
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 14px;
		line-height: 1.6;
		color: #c8d3ee;
		word-break: break-word;

		.ai-bubble-content :global(p) {
			margin: 4px 0;
		}
		.ai-bubble-content :global(ul),
		.ai-bubble-content :global(ol) {
			padding-left: 1.2em;
			margin: 4px 0;
		}
		.ai-bubble-content :global(li) {
			list-style-position: inside;
		}
		.ai-bubble-content :global(code) {
			font-size: 12px;
			background: rgba(0, 0, 0, 0.3);
			padding: 1px 4px;
			border-radius: 3px;
		}
		.ai-bubble-content :global(pre) {
			font-size: 12px;
			background: rgba(0, 0, 0, 0.3);
			padding: 8px;
			border-radius: 6px;
			overflow-x: auto;
		}
	}

	.insert-btn {
		font-size: 14px;
		padding: 8px;
		border-radius: 4px;
		color: #8a9bb5;
		cursor: pointer;
		transition: color 0.2s;
		position: absolute;
		right: -30px;
		top: 8px;

		&:hover {
			color: #c8d3ee;
		}

		&:global(.i-ok) {
			color: #5a9;
		}
	}

	// ── Reasoning (thinking process) ──────────────────────────────
	.reasoning {
		font-size: 12px;
		color: #5a6a7e;
		line-height: 1.5;
		padding: 6px 0 10px 4px;
		max-width: 85%;
		word-break: break-word;
		white-space: pre-wrap;

		:global(.reasoning-toggle) {
			background: none;
			border: none;
			color: #6a8ab5;
			font-size: 11px;
			cursor: pointer;
			padding: 0;
			margin-left: 4px;
			text-decoration: underline;
			text-underline-offset: 2px;

			&:hover {
				color: #8aabdd;
			}
		}
	}

	// ── Pending changes ────────────────────────────────────────────
	.pending {
		padding: 12px 16px;

		.pending-label {
			font-size: 13px;
			color: #8a9bb5;
			margin: 0 0 10px;
		}

		.pending-changes {
			list-style: none;
			padding: 0;
			margin: 0 0 10px;

			li {
				font-size: 13px;
				color: #c8d3ee;
				padding: 4px 0;
				line-height: 1.5;

				&::before {
					content: '▸ ';
					color: rgba(64, 160, 100, 0.6);
				}
			}
		}

		.pending-actions {
			display: flex;
			gap: 8px;
			margin-top: 4px;
		}

		.apply-btn {
			padding: 5px 16px;
			border: none;
			border-radius: 4px;
			background: rgba(64, 160, 100, 0.35);
			color: #8fc9a0;
			font-size: 13px;
			cursor: pointer;
			&:hover {
				background: rgba(64, 160, 100, 0.55);
			}
		}

		.dismiss-btn {
			padding: 5px 16px;
			border: none;
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.06);
			color: #8a9bb5;
			font-size: 13px;
			cursor: pointer;
			&:hover {
				background: rgba(255, 255, 255, 0.12);
			}
		}
	}

	// ── Scroll-to-bottom button ────────────────────────────────────
	.scroll-bottom-btn {
		position: sticky;
		bottom: 8px;
		display: block;
		margin: 0 auto;
		padding: 3px 10px;
		border-radius: 10px;
		border: none;
		background: rgba(20, 25, 40, 0.85);
		color: #4a5568;
		font-size: 11px;
		cursor: pointer;
		z-index: 2;
		width: fit-content;
		white-space: nowrap;

		&:hover {
			background: rgba(30, 40, 60, 0.9);
			color: #6a7a8e;
		}
	}

	.dot {
		&::after {
			content: '';
			animation: dots 1.2s steps(4, end) infinite;
		}
	}

	@keyframes dots {
		0% {
			content: '';
		}
		25% {
			content: '.';
		}
		50% {
			content: '..';
		}
		75% {
			content: '...';
		}
	}

	.input-area {
		padding: 8px 16px 12px;
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
	}

	.input-row {
		display: flex;
		gap: 8px;
		align-items: flex-start;

		textarea {
			background: none;
			flex: 1;
			border-radius: 8px;
			color: #c8d3ee;
			padding: 0;
			font-size: 14px;
			resize: none;
			border: none;
			outline: none;

			&::placeholder {
				color: rgba(127, 146, 161, 0.5);
			}
		}

		button {
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.05);
			padding: 8px;
			border: none;
			color: #c8d3ee;
			font-size: 18px;
			cursor: pointer;
			white-space: nowrap;
			flex-shrink: 0;

			&:hover:not(:disabled) {
				background: rgba(64, 128, 255, 0.5);
			}

			&:disabled {
				opacity: 0.4;
				cursor: not-allowed;
			}
		}
	}

	.controls-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 6px;
		gap: 8px;
	}

	.model-group {
		display: flex;
		align-items: center;
		gap: 4px;

		select {
			background: rgba(255, 255, 255, 0.05);
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 4px;
			color: #8a9bb5;
			font-size: 12px;
			padding: 3px 6px;
			cursor: pointer;
			outline: none;

			&:hover {
				border-color: rgba(255, 255, 255, 0.15);
			}

			&:focus {
				border-color: rgba(64, 128, 255, 0.4);
			}

			option {
				background: #1a2030;
				color: #c8d3ee;
			}
		}
	}

	.refresh-btn {
		font-size: 13px;
		padding: 4px;
		border-radius: 3px;
		color: #6a7a8e;
		cursor: pointer;
		border: none;
		background: none;

		&:hover:not(:disabled) {
			color: #8a9bb5;
		}
		&:disabled {
			opacity: 0.3;
			cursor: default;
		}
	}
</style>

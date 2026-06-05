<script lang="ts">
	import { aiMessages, aiLoading, aiStreaming, aiPending, sendAiMessage, type AiMessage, type PendingAction } from './aiStore';
	import { editorTools } from '$lib/store';
	import { marked } from 'marked';
	import { get } from 'svelte/store';
	import { configureMarked } from '$lib/marked-config';

	configureMarked();

	function initMermaid(root) {
		const blocks = root.querySelectorAll('pre.mermaid');
		if (!blocks.length) return;
		import('mermaid').then((m) => {
			m.default.initialize({ startOnLoad: false, theme: 'dark', suppressErrorRendering: true });
			Array.from(blocks).forEach((b) => {
				m.default.run({ nodes: [b] }).catch(() => {});
			});
		});
	}

	let {
		model = '',
		close
	}: {
		model?: string;
		close?: () => void;
	} = $props();

	let inputValue = $state('');
	let chatEl = $state<HTMLDivElement>();
	let copiedIdx = $state<Set<number>>(new Set());

	function scrollToBottom() {
		if (chatEl) {
			requestAnimationFrame(() => {
				chatEl!.scrollTop = chatEl!.scrollHeight;
			});
		}
	}

	$effect(() => {
		// Scroll when messages or streaming changes
		void get(aiMessages);
		void get(aiStreaming);
		scrollToBottom();
		if (chatEl) initMermaid(chatEl);
	});

	async function handleSend() {
		const v = inputValue.trim();
		if (!v || $aiLoading) return;
		inputValue = '';
		const fns = get(editorTools);
		console.log('[AiPanel] tools keys:', Object.keys(fns), 'count:', Object.keys(fns).length);
		await sendAiMessage(v, fns, model || undefined);
		scrollToBottom();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function renderMarkdown(text: string): string {
		if (!text) return '';
		const html = marked.parse(text) as string;
		return html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<pre class="mermaid">$1</pre>');
	}
</script>

<div class="ai-panel">
	<div class="ai-header">
		<span>AI Assistant</span>
		{#if close}
			<button class="icon i-close" onclick={close}></button>
		{/if}
	</div>
	<div class="chat" bind:this={chatEl}>
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
					<div class="bubble">Reading document...</div>
				</div>
			{:else if msg.role === 'assistant' && msg.content}
				<div class="msg assistant">
					<div class="bubble">
						{@html renderMarkdown(msg.content)}
						<button
							class="insert-btn icon"
							class:i-ok={copiedIdx.has(i)}
							class:i-copy={!copiedIdx.has(i)}
							onclick={() => {
								navigator.clipboard.writeText(msg.content);
								const next = new Set(copiedIdx);
								next.add(i);
								copiedIdx = next;
								setTimeout(() => {
									const clear = new Set(copiedIdx);
									clear.delete(i);
									copiedIdx = clear;
								}, 3000);
							}}
							title="Copy to clipboard"
						></button>
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
					<p class="pending-label">Apply changes?</p>
					{#each $aiPending.toolLabels as label}
						<code class="pending-tool">{label}</code>
					{/each}
					<div class="pending-actions">
						<button class="apply-btn" onclick={() => $aiPending.resolve(true)}>Apply</button>
						<button class="dismiss-btn" onclick={() => $aiPending.resolve(false)}>Dismiss</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
	<div class="input-area">
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
</div>

<style lang="scss">
	@use '../../break' as *;

	.ai-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		background: var(--bg1);
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

			.bubble {
				background: rgba(255, 255, 255, 0.05);
			}
		}

		&.loading .bubble {
			padding: 8px 16px;
		}
	}

	.bubble {
		max-width: 85%;
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 14px;
		line-height: 1.6;
		color: #c8d3ee;
		word-break: break-word;

		:global {
			p {
				margin: 4px 0;
			}

			ul,
			ol {
				padding-left: 1.2em;
				margin: 4px 0;
			}

			li {
				list-style-position: inside;
			}

			code {
				font-size: 12px;
				background: rgba(0, 0, 0, 0.3);
				padding: 1px 4px;
				border-radius: 3px;
			}

			pre {
				font-size: 12px;
				background: rgba(0, 0, 0, 0.3);
				padding: 8px;
				border-radius: 6px;
				overflow-x: auto;
			}
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

	.pending {
		padding: 12px 16px;

		.pending-label {
			font-size: 13px;
			color: #8a9bb5;
			margin: 0 0 8px;
		}
		.pending-tool {
			display: block;
			font-size: 12px;
			color: #7a8ba5;
			background: rgba(0, 0, 0, 0.25);
			padding: 3px 8px;
			border-radius: 4px;
			margin: 2px 0;
		}
		.pending-actions {
			display: flex;
			gap: 8px;
			margin-top: 10px;
		}
		.apply-btn {
			padding: 4px 14px;
			border: none;
			border-radius: 4px;
			background: rgba(64, 160, 100, 0.35);
			color: #8fc9a0;
			font-size: 13px;
			cursor: pointer;
			&:hover { background: rgba(64, 160, 100, 0.55); }
		}
		.dismiss-btn {
			padding: 4px 14px;
			border: none;
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.06);
			color: #8a9bb5;
			font-size: 13px;
			cursor: pointer;
			&:hover { background: rgba(255, 255, 255, 0.12); }
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
		padding: 12px 16px;
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
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

			&:hover:not(:disabled) {
				background: rgba(64, 128, 255, 0.5);
			}

			&:disabled {
				opacity: 0.4;
				cursor: default;
			}
		}
	}
</style>

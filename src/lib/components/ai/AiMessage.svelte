<script lang="ts" module>
	import type { ToolCall } from './types';

	/** Human-readable tool label — exported for use in AiPanel's pending section. */
	export function toolSummary(tc: ToolCall): string {
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

<script lang="ts">
	import { marked } from 'marked';
	import { configureMarked } from '$lib/marked-config';
	import type { AiMessage as AiMsg } from './types';

	configureMarked();

	const REASONING_PREVIEW = 150;

	function renderMd(text: string): string {
		if (!text) return '';
		const html = marked.parse(text) as string;
		return html.replace(
			/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
			'<pre class="mermaid">$1</pre>'
		);
	}

	let {
		msg,
		displayContent = '',
		options = [] as string[],
		showOptions = false,
		copied = false,
		reasoningExpanded = false,
		reasoningToggleNeeded = false,
		oncopy,
		ontogglereasoning,
		onquickreply,
	}: {
		msg: AiMsg;
		displayContent?: string;
		options?: string[];
		showOptions?: boolean;
		copied?: boolean;
		reasoningExpanded?: boolean;
		reasoningToggleNeeded?: boolean;
		oncopy?: () => void;
		ontogglereasoning?: () => void;
		onquickreply?: (text: string) => void;
	} = $props();
</script>

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
					{#if reasoningExpanded || rlen <= REASONING_PREVIEW}
						{msg.reasoning_content}
						{#if reasoningToggleNeeded}
							<button class="reasoning-toggle" onclick={ontogglereasoning}>Show less</button>
						{/if}
					{:else}
						{msg.reasoning_content.slice(0, REASONING_PREVIEW)}…
						<button class="reasoning-toggle" onclick={ontogglereasoning}>Show more</button>
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
					{#if reasoningExpanded || rlen <= REASONING_PREVIEW}
						{msg.reasoning_content}
						{#if reasoningToggleNeeded}
							<button class="reasoning-toggle" onclick={ontogglereasoning}>Show less</button>
						{/if}
					{:else}
						{msg.reasoning_content.slice(0, REASONING_PREVIEW)}…
						<button class="reasoning-toggle" onclick={ontogglereasoning}>Show more</button>
					{/if}
				</div>
			{/if}
			<div class="bubble">
				<div class="ai-bubble-content">
					{@html renderMd(displayContent || msg.content)}
				</div>
				<button
					class="insert-btn icon"
					class:i-ok={copied}
					class:i-copy={!copied}
					onclick={oncopy}
					title="Copy to clipboard"
				></button>
			</div>
			{#if showOptions && options.length > 0}
				<div class="quick-replies">
					{#each options as opt}
						<button class="quick-reply-chip" onclick={() => onquickreply?.(opt)}>{opt}</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
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
	}

	.bubble {
		position: relative;
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

	.quick-replies {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}

	.quick-reply-chip {
		padding: 6px 14px;
		border: 1px solid rgba(143, 201, 160, 0.25);
		border-radius: 16px;
		background: rgba(143, 201, 160, 0.08);
		color: #8fc9a0;
		font-size: 13px;
		line-height: 1.5;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;

		&:hover {
			background: rgba(64, 160, 100, 0.2);
			border-color: rgba(64, 160, 100, 0.35);
			color: #a8e0b8;
		}
	}
</style>

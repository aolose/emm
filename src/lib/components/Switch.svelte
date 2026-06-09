<script lang="ts">
	let {
		checked = $bindable(false),
		disabled = false,
		title = '',
		children
	}: {
		checked?: boolean;
		disabled?: boolean;
		title?: string;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<label class="switch" class:on={checked} class:disabled {title}>
	<input type="checkbox" bind:checked {disabled} />
	<span class="track">
		<span class="thumb"></span>
	</span>
	{#if children}
		<span class="label">{@render children()}</span>
	{/if}
</label>

<style lang="scss">
	.switch {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;

		&.disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}

		input[type='checkbox'] {
			position: absolute;
			opacity: 0;
			width: 0;
			height: 0;
		}
	}

	.track {
		position: relative;
		display: inline-block;
		width: 36px;
		height: 20px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		transition: background 0.2s ease;
		flex-shrink: 0;
	}

	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: #8a9bb5;
		border-radius: 50%;
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}

	.on {
		.track {
			background: rgba(64, 160, 100, 0.45);
		}

		.thumb {
			transform: translateX(16px);
			background: #8fc9a0;
		}
	}

	.label {
		font-size: 13px;
		color: #8a9bb5;
		line-height: 1;
	}

	.on .label {
		color: #8fc9a0;
	}
</style>

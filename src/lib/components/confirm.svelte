<script>
	import { run, stopPropagation } from 'svelte/legacy';

	import { onMount } from 'svelte';
	import { confirmStore } from '$lib/store';
	import { fade } from 'svelte/transition';

	let cfg = $state({});
	onMount(() => {
		return confirmStore.subscribe((c) => (cfg = c));
	});

	function ok() {
		cancel();
		cfg.resolve?.(1);
	}

	function cancel(e) {
		confirmStore.set({ ...cfg, show: false });
		if (e) cfg.reject?.();
	}

	function esc(e) {
		if (cfg.show && e.code === 'Escape') {
			cancel();
		}
	}

	let bo = $state(),
		bc = $state();
	run(() => {
		if (typeof cfg.text === 'object') cfg.text = JSON.stringify(cfg.text);
		if (cfg.show) (bo || bc)?.focus();
	});
</script>

<svelte:window onkeydown={esc} />
{#if cfg.show}
	<div class="a" class:act={cfg.show} transition:fade|global>
		<div class="b" onclick={stopPropagation(() => 0)}>
			<p>{cfg.text}</p>
			<div class="n">
				{#if cfg.ok}
					<button bind:this={bo} onclick={ok}>{cfg.ok}</button>
				{/if}
				{#if cfg.cancel}
					<button bind:this={bc} onclick={cancel}>{cfg.cancel}</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.a {
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		z-index: 110;
		backdrop-filter: blur(1px);
		background: rgba(23, 25, 30, 0.36);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.b {
		padding: 30px;
		border-radius: 6px;
		background: var(--bg1);
		box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 9px;
	}

	.n {
		display: flex;
		justify-content: center;
		gap: 16px;
	}

	p {
		padding: 0 10px;
		line-height: 2;
		font-size: 15px;
		margin: 10px 0 30px;
		text-align: center;
	}

	button {
		cursor: pointer;
		color: #b6bac0;
		padding: 4px 8px;
		min-width: 60px;
		border-radius: 111px;
		width: 100px;
		filter: hue-rotate(-30deg);
		& + button {
			filter: hue-rotate(30deg);
		}
	}
</style>

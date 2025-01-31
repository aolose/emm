<script>
	import { run, stopPropagation } from 'svelte/legacy';

	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	let { items = [], value = $bindable(), placeholder = '' } = $props();
	let h = $state(0);
	let val = $state('');
	const s = (k) => () => {
		h = 0;
		value = k;
	};
	let cur = $state();
	run(() => {
		const i = items.find((a) => a[0] === value);
		val = i?.[1] || placeholder;
	});
	onMount(() => {
		const fn = () => (h = 0);
		window.addEventListener('click', fn);
		return () => {
			window.removeEventListener('click', fn);
		};
	});
</script>

<div class="s" bind:this={cur} onclick={stopPropagation(() => 0)}>
	<div class="a" onclick={() => (h = 1 - h)}>
		<span>{val}</span>
		<i></i>
	</div>
	{#if h}
		<div class="b" transition:slide|global={{ duration: 100 }}>
			{#each items as [k, v]}
				<div class:e={k === value} onclick={stopPropagation(s(k))}>{v}</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.s {
		width: 0;
		flex-grow: 1;
	}

	.a {
		cursor: pointer;
		display: flex;
		align-items: center;
		background: var(--bg1);
		height: 48px;
		border-radius: 8px;
		padding: 0 10px;

		span {
			flex: 1;
		}

		i {
			border: 5px transparent solid;
			border-bottom: 0;
			border-top-color: currentColor;
			opacity: 0.5;
		}
	}

	.b {
		z-index: 100;
		position: absolute;
		top: 100%;
		left: 0;
		width: 100%;
		background: var(--bg1);
		box-shadow: rgba(0, 0, 0, 0.1) 0 10px 10px;

		div {
			height: 34px;
			display: flex;
			align-items: center;
			font-size: 14px;
			padding: 0 10px;
			cursor: pointer;

			&:hover {
				background: #1c334a;
			}

			&.e {
				background: #0f395e;
			}
		}
	}
</style>

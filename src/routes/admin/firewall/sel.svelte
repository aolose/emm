<script>
	import { run, stopPropagation } from 'svelte/legacy';

	import { slide } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	let {
		getValue,
		getText,
		defaultValue = '',
		multiply = true,
		value = $bindable(),
		items = []
	} = $props();
	let s = $state(new Set());
	let e = $state();
	const ck = (v) => (ev) => {
		ev.stopPropagation();
		if (multiply) {
			if (s.has(v)) s.delete(v);
			else s.add(v);
			value = [...s].filter((a) => a).join();
		} else {
			value = getValue ? getValue(v) : v;
			window.removeEventListener('click', fn);
		}
		if (!multiply) e = 0;
	};
	const fn = () => {
		if (e) {
			window.removeEventListener('click', fn);
			e = 0;
		} else {
			e = 1;
			window.addEventListener('click', fn);
		}
	};
	onDestroy(() => {
		window.removeEventListener('click', fn);
	});
	run(() => {
		if (!value) value = defaultValue;
		if (multiply) s = new Set(value.split(','));
	});
</script>

<div class="a" class:c={e} onclick={stopPropagation(fn)}>
	<span>{getText ? getText(items.find((a) => getValue(a) === value)) : value}</span>
	{#if e}
		<div transition:slide|global class="b">
			{#each items as k}
				<div
					class:s={multiply ? s.has(k) : value === getValue ? getValue(k) : k}
					onclick={stopPropagation(ck(k))}
				>
					{getText ? getText(k) : k}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.a {
		height: 48px;
		width: 0;
		resize: none;
		border-radius: 8px;
		background: var(--bg1);
		flex: 1;
		display: flex;
		align-items: center;

		span {
			overflow: hidden;
			width: 100%;
			white-space: nowrap;
			text-overflow: ellipsis;
			padding: 0 10px;
			color: rgba(222, 226, 232, 0.6);
		}
	}

	.b {
		cursor: pointer;
		position: absolute;
		z-index: 10;
		top: 35px;
		opacity: 0.9;
		background: var(--bg1);
		width: 100%;
		left: 0;
		color: #6c7a93;
		font-size: 13px;

		div {
			padding: 8px 20px;

			&:hover {
				background: rgba(0, 0, 0, 0.1);
			}

			& + div {
				border-top: 1px solid #273644;
			}
		}

		.s {
			background: rgba(23, 39, 59, 0.2);
			color: #fff;
		}
	}
</style>

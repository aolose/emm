<script>
	import { slide } from 'svelte/transition';

	export let value = '';
	export let items = [];
	let s = new Set();
	let e;
	const ck = (v) => (e) => {
		e.stopPropagation();
		if (s.has(v)) s.delete(v);
		else s.add(v);
		value = [...s].filter((a) => a).join();
	};
	$: {
		if (!value) value = '';
		s = new Set(value.split(','));
	}
</script>

<div class="a" class:c={e} on:click={() => (e = !e)}>
	<span>{value}</span>
	{#if e}
		<div transition:slide class="b">
			{#each items as k}
				<div class:s={s.has(k)} on:click={ck(k)}>
					{k}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.a {
		height: 34px;
		width: 0;
		resize: none;
		border: 1px solid #304565;
		background: var(--bg1);
		flex: 1;
		box-shadow: inset var(--bg0) 0 0 5 px;
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
			&:hover {
				background: rgba(0, 0, 0, 0.1);
			}

			padding: 8px 20px;

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

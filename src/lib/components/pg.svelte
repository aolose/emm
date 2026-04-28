<script>
	import { flip } from 'svelte/animate';
	let { total = 1, page = $bindable(1), go, tm, length = 4, loading = false } = $props();
	let first = $state(),
		isF = $state(),
		f = $state(),
		n = $state(),
		last = $state(),
		pg = $state(),
		pending = $state(0);
	const setPage = (n) => () => {
		pending = n;
		go(n);
		page = n;
	};
	const trackClick = (n) => () => {
		pending = n;
	};
	$effect(() => {
		if (!loading) pending = 0;
	});
	$effect(() => {
		last = page === total;
		first = page === 1;
		isF = typeof go === 'function';
		let g = [];
		if (2 < total) {
			if (page < total && page > 1) g = [page];
			for (let i = 1; i <= length && g.length < length; i++) {
				const pr = page - i;
				const nx = page + i;
				if (pr > 1) g = [pr, ...g];
				if (nx < total) g = [...g, nx];
			}
		}
		f = g[0] > 2 ? '...' : '';
		n = g[g.length - 1] < total - 1 ? '...' : '';
		pg = [...g];
	});
</script>

<nav class:lt={tm}>
	{#if isF}
		<span class="nv" class:act={first} class:loading={loading && first} onclick={setPage(1)}>1</span>
	{:else}
		<a class="nv" class:act={(!loading && first) || (loading && pending === 1)} class:loading={loading && pending === 1} href={`${go}/1`} onclick={trackClick(1)}>1</a>
	{/if}
	{#if f}<span>{f}</span>{/if}
	{#each pg as p (p)}
		<span animate:flip={{ duration: 300 }}>
			{#if isF}
				<span class="nv" class:act={page === p} class:loading={loading && page === p} onclick={setPage(p)}>{p}</span>
			{:else}
				<a class="nv" class:act={(!loading && page === p) || (loading && pending === p)} class:loading={loading && pending === p} href={`${go}/${p}`} onclick={trackClick(p)}>{p}</a>
			{/if}
		</span>
	{/each}
	{#if n}<span>{n}</span>{/if}
	{#if total > 1}
		{#if isF}
			<span class="nv" class:act={last} class:loading={loading && last} onclick={setPage(total)}>{total}</span>
		{:else}
			<a class="nv" class:act={(!loading && last) || (loading && pending === total)} class:loading={loading && pending === total} href={`${go}/${total}`} onclick={trackClick(total)}>{total}</a>
		{/if}
	{/if}
</nav>

<style lang="scss">
	:root {
		--act: #65b9e7;
	}

	nav {
		align-items: center;
		justify-content: center;
		display: flex;
		* {
			color: rgb(78, 96, 115);
		}

		.act {
			color: antiquewhite;
			background: var(--act);
			&.loading {
				animation: pageloading 1.2s ease-in-out infinite;
			}
		}

		.nv {
			font-size: 12px;
			cursor: pointer;
			height: 24px;
			min-width: 24px;
			padding: 0 5px;
			display: flex;
			margin: 0 5px;
			justify-content: center;
			align-items: center;
			border-radius: 32px;
			transition: background 0.3s, color 0.3s, transform 0.3s;

			&:hover {
				color: #65b9e7;
			}
		}
	}

	@keyframes pageloading {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	.lt {
		* {
			color: rgba(100, 116, 156, 0.9);
		}

		.nv {
			background: none;
			padding: 5px 8px;
			height: 24px;
			width: auto;
			border-radius: 111px;
		}

		.act,
		.nv:hover {
			color: #fff;
			background: var(--darkgrey);
		}

		.act.loading {
			animation: pageloading 1.2s ease-in-out infinite;
		}
	}
</style>

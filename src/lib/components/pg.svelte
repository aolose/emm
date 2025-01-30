<script lang="ts">
	import { run } from 'svelte/legacy';

	interface Props {
		total?: number;
		page?: number;
		go: any;
		tm: any;
		length?: number;
	}

	let { total = 1, page = $bindable(1), go, tm, length = 4 }: Props = $props();
	let first = $state(),
		isF = $state(),
		f = $state(),
		n = $state(),
		last = $state(),
		pg = $state();
	const setPage = (n) => () => {
		go(n);
		page = n;
	};
	run(() => {
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
		<span class="nv" class:act={first} onclick={setPage(1)}>1</span>
	{:else}
		<a class="nv" class:act={first} href={`${go}/1`}>1</a>
	{/if}
	{#if f}<span>{f}</span>{/if}
	{#each pg as p}
		{#if isF}
			<span class="nv" class:act={page === p} onclick={setPage(p)}>{p}</span>
		{:else}
			<a class="nv" class:act={page === p} href={`${go}/${p}`}>{p}</a>
		{/if}
	{/each}
	{#if n}<span>{n}</span>{/if}
	{#if total > 1}
		{#if isF}
			<span class="nv" class:act={last} onclick={setPage(total)}>{total}</span>
		{:else}
			<a class="nv" class:act={last} href={`${go}/${total}`}>{total}</a>
		{/if}
	{/if}
</nav>

<style lang="scss">
  :root {
    --act: var(--bg0);
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

      &:hover {
        color: #65b9e7;
      }
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
  }
</style>

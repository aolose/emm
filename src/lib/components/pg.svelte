<script>
	import { flip } from 'svelte/animate';

	let {
		total = 1,
		page = $bindable(1),
		go,
		tm,
		loading = false
	} = $props();

	// 1. 交互状态
	let pending = $state(0);
	let displayPage = $state(page);
	let prevLoading = $state(false);

	const isF = $derived(typeof go === 'function');
	const activePage = $derived(pending ? pending : page);

	// 位置冻结：loading 期间不更新 displayPage
	$effect(() => {
		const ended = prevLoading && !loading;
		if (!loading) displayPage = page;
		if (ended && pending) pending = 0;
		prevLoading = loading;
	});

	// 2. 纯数字状态派生（基于 displayPage 计算）
	const pages = $derived.by(() => {
		if (total <= 5) {
			const res = [];
			for (let i = 1; i <= total; i++) res.push(i);
			return res;
		}
		let allowedNumbers = [];
		if (displayPage <= 2) {
			allowedNumbers = [1, 2, 3, total - 1, total];
		} else if (displayPage >= total - 1) {
			allowedNumbers = [1, 2, total - 2, total - 1, total];
		} else if (displayPage === 3) {
			allowedNumbers = [1, 2, 3, 4, total];
		} else if (displayPage === total - 2) {
			allowedNumbers = [1, total - 3, total - 2, total - 1, total];
		} else {
			allowedNumbers = [1, displayPage - 1, displayPage, displayPage + 1, total];
		}
		return Array.from(new Set(allowedNumbers)).sort((a, b) => a - b);
	});

	// 3. 事件处理
	const setPage = (n) => (e) => {
		pending = n;
		go(n);
		page = n;
	};
	const trackClick = (n) => () => {
		pending = n;
	};
</script>

<nav class:lt={tm}>
	{#each pages as p (p)}
		<svelte:element
			this={isF ? 'span' : 'a'}
			animate:flip={{ duration: 300 }}
			class="nv"
			class:act={activePage === p}
			class:loading={loading && pending === p}
			href={isF ? undefined : `${go}/${p}`}
			onclick={isF ? setPage(p) : trackClick(p)}
		>
			{p}
		</svelte:element>
	{/each}
</nav>

<style lang="scss">
  nav {
    align-items: center;
    justify-content: center;
    display: flex;
    * { color: rgb(78, 96, 115); }

    .act {
      color: #fff;
      background: rgb(26 48 87 / 70%);
      &.loading { animation: pageloading 1.2s ease-in-out infinite; }
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
      transition: background 0.3s, color 0.3s;
      text-decoration: none;
      &:hover { color: #65b9e7; }
    }
  }

  @keyframes pageloading {
    0%, 100% { background-color: var(--c-primary); }
    50% { background-color: rgba(100, 116, 156, 0.4); }
  }

  .lt {
    * { color: rgba(100, 116, 156, 0.9); }
    .nv {
      background: none;
      padding: 5px 8px;
      height: 24px;
      width: auto;
      border-radius: 111px;
    }
    .act, .nv:hover {
      color: #fff;
      background: var(--darkgrey);
    }
    .act.loading { animation: pageloading-lt 1.2s ease-in-out infinite; }
  }

  @keyframes pageloading-lt {
    0%, 100% { background-color: var(--darkgrey); }
    50% { background-color: rgba(100, 116, 156, 0.3); }
  }
</style>
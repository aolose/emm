<script>
	import { flip } from 'svelte/animate';

	// 1. 定义解构属性
	let {
		total = 1,
		page = $bindable(1),
		go,
		tm,
		length = 4,
		loading = false
	} = $props();

	// 2. 仅保留交互产生的状态
	let pending = $state(0);

	// 3. 使用 $derived 代替 $effect，解决状态同步与报错问题
	const isF = $derived(typeof go === 'function');
	const first = $derived(page === 1);
	const last = $derived(page === total);

	// 完美修复：高效率且顺序正确的页码计算
	const pg = $derived.by(() => {
		if (total <= 2) return [];

		let start = Math.max(2, page - Math.floor(length / 2));
		let end = start + length - 1;

		if (end >= total) {
			end = total - 1;
			start = Math.max(2, end - length + 1);
		}

		const pages = [];
		for (let i = start; i <= end; i++) {
			pages.push(i);
		}
		return pages;
	});

	const f = $derived(pg[0] > 2 ? '...' : '');
	const n = $derived(pg[pg.length - 1] < total - 1 ? '...' : '');

	// 4. 处理加载状态的逻辑可以保留在一个轻量 effect 中
	$effect(() => {
		if (!loading) pending = 0;
	});

	// 5. 事件处理
	const setPage = (n) => () => {
		pending = n;
		go(n);
		page = n;
	};

	const trackClick = (n) => () => {
		pending = n;
	};
</script>

<nav class:lt={tm}>
	<!-- 第一页 -->
	{#if isF}
		<span class="nv" class:act={first} class:loading={loading && first} onclick={setPage(1)}>1</span>
	{:else}
		<a class="nv" class:act={(!loading && first) || (loading && pending === 1)} class:loading={loading && pending === 1} href={`${go}/1`} onclick={trackClick(1)}>1</a>
	{/if}

	<!-- 前省略号 -->
	{#if f}<span>{f}</span>{/if}

	<!-- 中间页码 -->
	{#each pg as p (p)}
		<!-- 注意：为了让 flip 生效，最好在外层包裹，且确保页码有平滑的位移 -->
		<span animate:flip={{ duration: 300 }}>
      {#if isF}
        <span class="nv" class:act={page === p} class:loading={loading && page === p} onclick={setPage(p)}>{p}</span>
      {:else}
        <a class="nv" class:act={(!loading && page === p) || (loading && pending === p)} class:loading={loading && pending === p} href={`${go}/${p}`} onclick={trackClick(p)}>{p}</a>
      {/if}
    </span>
	{/each}

	<!-- 后省略号 -->
	{#if n}<span>{n}</span>{/if}

	<!-- 最后一页 -->
	{#if total > 1}
		{#if isF}
			<span class="nv" class:act={last} class:loading={loading && last} onclick={setPage(total)}>{total}</span>
		{:else}
			<a class="nv" class:act={(!loading && last) || (loading && pending === total)} class:loading={loading && pending === total} href={`${go}/${total}`} onclick={trackClick(total)}>{total}</a>
		{/if}
	{/if}
</nav>

<style lang="scss">
  nav {
    align-items: center;
    justify-content: center;
    display: flex;
    * {
      color: rgb(78, 96, 115);
    }
    .act {
      color: antiquewhite;
      background: var(--c-primary);
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
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
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
      background: var(--darkgrey); /* 确保你全局定义了 --darkgrey 变量 */
    }
    .act.loading {
      animation: pageloading 1.2s ease-in-out infinite;
    }
  }
</style>
<script>
	import Ld from '$lib/components/loading.svelte';
	import { time } from '$lib/utils';
	import { req } from '$lib/req';
	import { onMount } from 'svelte';

	let ls = [];
	let page = 1;
	let total = 0;
	let ld = 0;
	const go = (n) => {
		if (n) page += n;
		if (page < 1) page = 1;
		if (total && page > total) page = total;
		ld = 1;
		req('reqs', page)
			.then((a) => {
				if (a) {
					const { total: t, items } = a;
					ls = items;
					total = t;
				} else {
					total = 0;
					ls = [];
				}
			})
			.finally(() => {
				ld = 0;
			});
	};
	onMount(() => {
		go();
	});
</script>

<div class="a">
	<div class="ls">
		{#each ls as { title, slug, _p }}
			<div class="i">
				<a href={`/post/${slug}`} {title}>{title}</a>
				<span>expire: {_p === -1 ? 'never' : time(_p)}</span>
			</div>
		{/each}
		{#if !ls || !ls.length}
			There is no hidden post.
		{/if}
	</div>
	<div class="b">
		<button on:click={() => go()}>refresh</button>
		{#if total}
			{#if page > 1}
				<button on:click={() => go(-1)}> newer </button>
			{/if}
			{#if page < total}
				<button on:click={() => go(1)}> older </button>
			{/if}
			<p>{page} / {total}</p>
		{/if}
	</div>
	<Ld act={ld} />
</div>

<style lang="scss">
	.a {
		width: 200px;
	}
	.i {
		width: 260px;
		margin-bottom: 10px;
		alignment: center;
		display: flex;
		justify-content: space-between;
		span {
			font-size: 13px;
			opacity: 0.5;
		}
		a {
			text-decoration: underline;
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		* {
			font-size: 15px;
			line-height: 1.5;
		}
	}

	.b {
		margin-top: 10px;
		display: flex;
	}

	button {
		font-size: 14px;
		color: #1c93ff;
		margin-right: 10px;
	}

	p {
		text-align: right;
		font-size: 13px;
		flex: 1;
		opacity: 0.8;
	}
</style>

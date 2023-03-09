<script>
	import Bird from '$lib/components/brid.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { msg } from '$lib/store';
	import { slidLeft } from '$lib/transition';
	import Ctx from '$lib/components/ctx.svelte';

	let c = 0;
	let h = 0;
	const m = ['welcome to my blog !'];
	let t, t0, a;
	onMount(() => {
		a = setTimeout(() => (h = 1), 300);
		t = setInterval(function () {
			const v = c++ % m.length;
			msg.set(m[v]);
		}, 1e3 * 10);
	});
	onDestroy(() => {
		clearInterval(t);
		clearTimeout(t0);
		clearTimeout(a);
	});
</script>

<Ctx />
<div class="b">
	<div class="bb">
		{#if h}
			<Bird />
		{/if}
	</div>
	<a class="rs" href="/rss" exact={false}>RSS</a>
	<div class="mu">
		<a href="/posts" transition:slidLeft|local>Posts -></a>
	</div>
</div>

<style lang="scss">
	@import '../../lib/break';
	.mu {
		position: absolute;
		right: 0;
		bottom: 0;
		padding: 30px;
		z-index: 3;
	}

	a {
		text-align: left;
		display: block;
		font-size: 20px;
		font-family: 'Architects Daughter', -apple-system, BlinkMacSystemFont, PingFang SC,
			Helvetica Neue, STHeiti, Microsoft Yahei, Tahoma, Simsun, sans-serif;
		position: relative;
		opacity: 0.8;
		white-space: nowrap;
		overflow: hidden;
		color: #000;
		transition: 0.3s ease-in-out;

		&:hover {
			opacity: 1;
		}
	}

	.b {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-bottom: 100px;
	}

	.bb {
		width: 50%;
		max-width: 80px;
	}
	.rs {
		position: absolute;
		bottom: 30px;
		left: 30px;
		color: #fff;
		font-family: -apple-system, BlinkMacSystemFont, PingFang SC, Helvetica Neue, STHeiti,
			Microsoft Yahei, Tahoma, Simsun, sans-serif;
		font-size: 13px;
		border: 1px solid;
		padding: 5px 15px;
		opacity: 0.7;
		border-radius: 100px;
	}
</style>

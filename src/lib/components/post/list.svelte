<script>
	import { run } from 'svelte/legacy';

	import Item from '$lib/components/post/item.svelte';
	import Ctx from '$lib/components/post/ctx.svelte';
	import Canvas from '$lib/components/ctx.svelte';
	import { tick } from 'svelte';
	import Nav from '$lib/components/pg.svelte';
	import Ph from '$lib/components/post/hd.svelte';
	import UpDownScroll from '$lib/components/upDownScroll.svelte';
	import { expand } from '$lib/store';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';

	let a = $state(0);

	async function scTop({ from, to }) {
		if (from?.route?.id !== to?.route?.id) return;
		await tick();
		if (sc) {
			document.scrollingElement.scrollTop = 0;
			window.scrollTo(0, 0);
			sc.scrollTop = 0;
		}
	}

	let sc = $state(),
		oh = $state(0),
		ih = $state(0);
	let { path = '', name = '', d = {}, children } = $props();
	let total = $state(1);
	run(() => {
		total = d.total;
	});
	let ls = $state([]);
	run(() => {
		ls = d.items || [];
	});
	afterNavigate(scTop);
</script>

<UpDownScroll bind:down={a} />
<Canvas type={1} />
<div class="o" class:e={$expand} transition:fade|global>
	<Ph bind:shrink={a}>
		{@render children?.()}
	</Ph>
	<div class="t" bind:this={sc} class:v={a} bind:offsetHeight={oh}>
		<Ctx>
			<div class="c" bind:offsetHeight={ih}>
				{#each ls as p, i (p.slug)}
					<Item {p} n={i} {path} />
				{/each}
			</div>
			{#if !ls.length}
				<p>No posts found.</p>
			{/if}
		</Ctx>
	</div>
	<div class="n" class:v={ih > oh && !a}>
		<div class="nn">
			<Nav {total} page={+$page.params.page || 1} length="2" go={'/' + name} tm="1" />
		</div>
	</div>
</div>

<style lang="scss">
	@use '../../break' as *;

	$w: 15px;
	$round: 16px;
	.nn {
		width: 90%;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		@include s() {
			justify-content: center;
		}
	}

	.t {
		position: absolute;
		top: 60px;
		bottom: 50px;
		left: 0;
		right: 0;
		overflow: auto;
		padding: 80px 0 0;
		transition: 0.3s ease-in-out;
		transform: translate3d(0, 0, 0);
		clip-path: inset(110px 0 0 0);
		@include s() {
			margin: 0 20px;
			scrollbar-width: none;
			bottom: 10px;
			padding: 130px 0 0;
			clip-path: inset(130px 0 0 0 round $round);
			top: 10px;
		}
	}

	.o {
		display: flex;
		flex-direction: column;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		transition: 0.3s ease-in-out;

		&.e {
			padding-top: 30px;
		}
	}

	.n {
		display: flex;
		align-items: center;
		transition: 0.3s ease-in-out;
		height: 60px;
		position: absolute;
		z-index: 10;
		bottom: 0;
		left: 0;
		right: 0;
		transform: translate3d(0, 0, 0);
		@include s() {
			height: 50px;
		}
	}

	.c {
		width: 100%;
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-content: baseline;
		@include s() {
			padding-bottom: 60px;
		}
	}

	.v {
		@include s() {
			&.t {
				clip-path: inset(0px 0px 40px 0 round $round);
			}
			&.n {
				transform: translate3d(0, 50px, 0);
			}
		}
	}

	p {
		padding: 20px 10px;
	}
</style>

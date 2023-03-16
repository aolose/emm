<script>
	import Bird from '$lib/components/brid.svelte';
	import { slidLeft } from '$lib/transition';
	import Ctx from '$lib/components/ctx.svelte';
	import Head from '$lib/components/Head.svelte';
</script>

<Head />
<Ctx />
<div class="b">
	<div class="bb">
		<Bird />
	</div>
	<a class="rs" href="/rss">RSS</a>
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
		font-family: 'Architects Daughter';
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
		font-size: 13px;
		border: 1px solid;
		padding: 5px 15px;
		opacity: 0.7;
		border-radius: 100px;
	}
</style>

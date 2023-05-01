<script>
	import Bird from '$lib/components/brid.svelte';
	import { slidLeft } from '$lib/transition';
	import Ctx from '$lib/components/ctx.svelte';
	import Head from '$lib/components/Head.svelte';
	export let data;
	const d = data.d;
</script>

<Head />
<Ctx />
<div class="b">
	<div class="bb">
		<Bird {d} />
	</div>
	<a class="rs" href="/rss">RSS</a>
	<div class="mu">
		<a href="/posts" transition:slidLeft class="a">Enter ➜</a>
	</div>
</div>

<style lang="scss">
	@import '../../lib/break';
	.mu {
		position: absolute;
		bottom: 30px;
		right: 20px;
		z-index: 3;
	}
	@keyframes a {
		46% {
			transform: rotateZ(-3deg) scale(1);
		}
		49% {
			transform: rotateZ(8deg) scale(1);
		}
		51% {
			transform: rotateZ(-8deg) scale(1);
		}
		55% {
			transform: rotateZ(3deg) scale(1);
		}
	}
	.a {
		animation: a infinite 4s reverse ease-in-out;
		transition: transform 0.2s ease-in-out;
		font-size: 22px;
		@include s() {
			font-size: 20px;
		}
	}
	a {
		text-align: left;
		display: block;
		font-size: 20px;
		font-family: 'Architects Daughter';
		position: relative;
		white-space: nowrap;
		overflow: hidden;
		color: #000;
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
	@include s() {
		.mu,
		.rs {
			bottom: 20px;
		}
	}
</style>

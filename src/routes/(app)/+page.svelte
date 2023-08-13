<script>
	import Bird from '$lib/components/brid.svelte';
	import { slidLeft } from '$lib/transition';
	import Ctx from '$lib/components/ctx.svelte';
	import Head from '$lib/components/Head.svelte';
	export let data;
	const d = data.d;
	const [linkedin,github,bio='']=d||[]
</script>

<Head />
<Ctx />
<div class="b">
	<div class="bb">
		<Bird d={bio}/>
	</div>
	<div class="rm">
		<a class="icon i-rss" href="/rss"></a>
		{#if linkedin}
       <a href={linkedin} target="_blank" class="icon i-LinkedIn"></a>
		{/if}
		{#if github}
       <a href={github} target="_blank" class="icon i-github"></a>
		{/if}
	</div>
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
  .i-rss{
		font-size: 14px;
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
	.rm{
		position: absolute;
		bottom: 30px;
		left: 30px;
		display: flex;
		align-items: center;
		color: #c3d7e5;
		a{
			color: inherit;
			text-shadow: 1px 1px 1px #000;
			margin-right: .8rem;
			opacity: 0.7;
			&:hover{
				opacity: 1;
			}
		}
	}
	@include s() {
		.mu,
		.rm {
			bottom: 20px;
		}
	}
</style>

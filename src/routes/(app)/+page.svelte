<script>
	import Bird from '$lib/components/brid.svelte';
	import Ctx from '$lib/components/ctx.svelte';
	import Head from '$lib/components/Head.svelte';
	export let data;
	const d = data.d;
	const [linkedin, github, bio = ''] = d || [];
</script>

<Head />
<Ctx />
<div class="b">
	<div class="bb">
		<Bird d={bio} />
	</div>
	<div class="rm">
		<a class="icon i-rss" href="/rss" />
		{#if linkedin}
			<a href={linkedin} target="_blank" class="icon i-LinkedIn" />
		{/if}
		{#if github}
			<a href={github} target="_blank" class="icon i-github" />
		{/if}
	</div>
</div>

<style lang="scss">
	@use '../../lib/break' as *;
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
	.rm {
		position: absolute;
		bottom: 30px;
		left: 10px;
		display: flex;
		align-items: center;
		a {
			font-size: 22px;
			margin-left: 0.8rem;
			transition: 0.2s;
			color: #fff;
			opacity: 0.8;
			&:hover {
				opacity: 1;
				transform: scale(1.1);
			}
		}
		.i-rss {
			font-size: 16px;
		}
	}
	@include s() {
		.rm {
			bottom: 20px;
		}
	}
</style>

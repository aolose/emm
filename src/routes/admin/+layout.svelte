<script>
	import Menu from './sideMenu.svelte';
	import Confirm from '$lib/components/confirm.svelte'
</script>

<div class="a">
	<div class="b">
		<Menu />
	</div>
	<div class="c">
		<slot />
	</div>
	<Confirm/>
</div>

<style lang="scss">
	.a {
		height: 100%;
		width: 100%;
		display: flex;
	}
	.b,
	.c {
		height: 100%;
	}
	.b {
		z-index: 1;
		width: 72px;
	}
	.c {
		background: var(--bg1);
		flex: 1;
	}
</style>

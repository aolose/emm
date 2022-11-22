<script>
	import Menu from "./sideMenu.svelte";
</script>
<div class="a">
	<div class="b">
		<Menu/>
	</div>
	<div class="c">
		<slot />
	</div>
</div>

<style lang="scss">
	.a {
		height: 100%;
		width: 100%;
		display: flex;
	}
	.b,
	.c {
		position: relative;
		height: 100%;
	}
	.b {
		box-shadow: rgba(0, 0, 0, 0.5) 2px 0 7px -3px;
		z-index: 1;
		width: 72px;
	}
	.c {
		background: #23272a;
		flex: 1;
	}
</style>

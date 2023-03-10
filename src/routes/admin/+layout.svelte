<script>
	import Menu from './sideMenu.svelte';
	import { seo } from '$lib/store';
	import Head from '$lib/components/Head.svelte';

	export let data;
</script>

<Head title={`${$seo.title} - Admin`} />
<div class="a">
	<div class="b">
		<Menu />
	</div>
	<div class="c">
		<slot />
	</div>
</div>

<style lang="scss">
	@import '../../lib/break';

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
		flex-shrink: 0;
		z-index: 1;
		width: 72px;
	}

	.c {
		background: var(--bg1);
		flex: 1;
		@include s(){
			height: 0;
		}
	}

	@include s() {
		.a {
			flex-direction: column;
		}
		.b {
			width: 100%;
			height: 48px;
		}
	}
</style>

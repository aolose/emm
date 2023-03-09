<script>
	import { fade } from 'svelte/transition';
	import { expand } from '$lib/store';
</script>

<div class="ctx" class:ex={$expand} transition:fade>
	<slot />
</div>

<style lang="scss">
	@import '../../break';
	.ctx {
		flex: 1;
		display: flex;
		width: 90%;
		flex-wrap: wrap;
		margin: 0 auto;
		align-content: baseline;
		transition: 0.3s ease-in-out;
		transform: translate3d(0, 0, 0);
		@include s() {
			width: 100%;
		}
	}
</style>

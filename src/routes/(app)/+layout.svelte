<script>
	import Nav from '$lib/components/nav.svelte';
	import { expand } from '$lib/store';

	let { children } = $props();

	let b = '';
</script>

<div class="b" style={b}>
	<div class="nv">
		<Nav />
	</div>
	<div class="g" class:ex={$expand}>
		{@render children?.()}
	</div>
</div>

<style lang="scss">
	@use 'sass:color';
	@use '../../lib/break' as *;

	:global {
		* {
			color: #8d9cb5;
		}
		*::-webkit-scrollbar-thumb {
			border-radius: 10px;
			background-color: color.adjust(#222f48, $alpha: -0.4);
		}
	}

	.nv {
		right: 0;
		left: 0;
		top: 0;
		z-index: 99;
		position: fixed;
	}

	.b {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		transition: 0.3s ease-in-out;
		background-size: cover;
	}

	.g {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		transition: 0.3s ease-in-out;

		&.ex {
			:global {
				.ctx {
					padding-top: 30px;
				}
			}
		}
	}
</style>

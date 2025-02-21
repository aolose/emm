<script>
	import Menu from './sideMenu.svelte';
	import { h, full } from '$lib/store';
	import Head from '$lib/components/Head.svelte';
	let { data, children } = $props();
</script>

<Head title={`${$h.title} - Admin`} />
<div class="a" class:full={$full}>
	<div class="b">
		<Menu />
	</div>
	<div class="c">
		{@render children?.()}
	</div>
</div>

<style lang="scss">
	@use '../../lib/break' as *;

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
		overflow: hidden;
		flex: 1;

		:global {
			h1 {
				font-size: 18px;
				font-weight: 400;
				color: transparent;
				background: linear-gradient(132deg, rgb(127, 203, 255), rgb(138, 135, 228));
				background-clip: text;
			}
		}

		@include s() {
			height: 0;
		}
	}

	@include s() {
		.a {
			flex-direction: column-reverse;
		}
		.b {
			padding: 0 7%;
			transition: 0.3s linear;
			width: 100%;
			height: 64px;
			overflow: hidden;
			background: linear-gradient(180deg, rgb(20, 22, 28), rgb(14, 17, 21));
			box-shadow: rgba(0, 0, 0, 0.5) 0 0 10px;
		}
		:global {
			.editor-toolbar {
				transition: 0.3s linear;
				height: 90px;
				overflow: hidden;
			}
		}
		.full {
			.b {
				height: 0;
			}

			:global {
				.editor-toolbar {
					height: 0;
					padding: 0;
				}
			}
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	import Nav from '$lib/components/nav.svelte';
	import { expand } from '$lib/store';

	let { children } = $props();

	let b = '';
	let updateToast = $state(false);
	let updateUrl = $state('');

	onMount(() => {
		const channel = new BroadcastChannel('sw-messages');
		channel.onmessage = (e) => {
			if (e.data?.type === 'CONTENT_UPDATED') {
				updateUrl = e.data.url;
				updateToast = true;
			}
		};
		return () => channel.close();
	});
</script>

<div class="b" style={b}>
	<div class="nv">
		<Nav />
	</div>
	<div class="g" class:ex={$expand}>
		{@render children?.()}
	</div>
</div>

{#if updateToast}
	<div class="sw-update-toast">Content updated. <button onclick={() => location.reload()}>Refresh</button><button class="dismiss" onclick={() => (updateToast = false)}>×</button></div>
{/if}

<style lang="scss">
	@use 'sass:color';
	@use '../../lib/break' as *;

	:global {
    *:not(svg):not(svg *){
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

	.sw-update-toast {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: #1e2230;
		border: 1px solid #3b4261;
		border-radius: 8px;
		padding: 10px 20px;
		color: #c8d3ee;
		font-size: 14px;
		z-index: 9999;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		gap: 12px;

		button {
			background: #4080ff;
			color: #fff;
			border: none;
			border-radius: 4px;
			padding: 4px 12px;
			cursor: pointer;
			font-size: 13px;
			&:hover {
				background: #5c94ff;
			}
		}

		.dismiss {
			background: transparent;
			color: #8a9bb5;
			padding: 0 4px;
			font-size: 18px;
			&:hover {
				color: #c8d3ee;
			}
		}
	}
</style>
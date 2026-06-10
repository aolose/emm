<script>
	import { onMount } from 'svelte';
	import Nav from '$lib/components/nav.svelte';
	import SwNotification from '$lib/components/SwNotification.svelte';
	import { expand } from '$lib/store';

	let { children } = $props();

	let b = '';
	let updateToast = $state(false);
	let mountedAt = 0;

	onMount(() => {
		mountedAt = Date.now();
		const channel = new BroadcastChannel('sw-messages');
		channel.onmessage = (e) => {
			if (e.data?.type === 'CONTENT_UPDATED') {
				// Cooldown: ignore updates within 5s of mount (post-CACHE_DONE reload)
				if (Date.now() - mountedAt < 5000) return;
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

<SwNotification
	manageSw={false}
	text="Content updated."
	actionLabel="Refresh"
	dismissLabel="×"
	bind:show={updateToast}
	onAction={() => window.location.reload()}
/>

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
</style>
<script>
	import Mobile from '$lib/components/Mobile.svelte';
	import Confirm from '$lib/components/confirm.svelte';
	import CustomElement from '$lib/components/customent/CustomElement.svelte';
	import { beforeNavigate } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { navStore } from '$lib/store';
	import SwNotification from '$lib/components/SwNotification.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { markHydrationDone } from '$lib/req';
	let { children } = $props();

	beforeNavigate((nav) => {
		navStore.set(nav);
	});

	onMount(() => markHydrationDone());
</script>

{#if $navigating}
	<div class="nav-indicator" transition:fade={{ duration: 150 }}></div>
{/if}

{@render children?.()}
<Mobile />
<Confirm />
<CustomElement />
<SwNotification />

<style>
	.nav-indicator {
		position: fixed;
		top: 0;
		left: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent, #3b82f6 20%, #60a5fa 80%, transparent);
		z-index: 9999;
		animation: nav-load 1.5s ease-in-out infinite;
	}

	@keyframes nav-load {
		0% {
			width: 0;
			left: 0;
		}
		50% {
			width: 50%;
		}
		100% {
			width: 0;
			left: 100%;
		}
	}
</style>

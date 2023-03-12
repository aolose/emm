<script>
	import Mobile from '$lib/components/Mobile.svelte';
	import Confirm from '$lib/components/confirm.svelte';
	import { h } from './head';
	import CustomElement from "$lib/components/customent/CustomElement.svelte";
</script>

<svelte:head>
	<title>{$h.title}</title>
	<meta name="keywords" content={$h.key} />
	<meta name="description" content={$h.desc} />
</svelte:head>
<slot />
<Mobile />
<Confirm />
<CustomElement/>

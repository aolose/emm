<script>
	import { h } from '$lib/store';
	export let title;
	export let description;
	export let keywords;
</script>

<svelte:head>
	<title>{title || $h.title || ''}</title>
	<meta name="keywords" content={keywords || $h.key || ''} />
	<meta name="description" content={description || $h.desc || ''} />
	<slot />
</svelte:head>

<script>
	import { h } from '$lib/store';

	let { title, description, keywords, children } = $props();
</script>

<svelte:head>
	<title>{title || $h.title || ''}</title>
	<meta name="keywords" content={keywords || $h.key || ''} />
	<meta name="description" content={description || $h.desc || ''} />
	{@render children?.()}
</svelte:head>

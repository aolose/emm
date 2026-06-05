<script>
	import { h } from '$lib/store';

	let { title, description, keywords, children } = $props();
</script>

<svelte:head>
	<title>{title || $h.title || ''}</title>
	<meta name="keywords" content={keywords || $h.key || ''} />
	<meta name="description" content={description || $h.desc || ''} />
	<link rel="alternate" type="application/rss+xml" href="/feed/rss" title="RSS" />
	<link rel="alternate" type="application/atom+xml" href="/feed/atom" title="Atom" />
	<link rel="alternate" type="application/feed+json" href="/feed/json" title="JSON Feed" />
	{@render children?.()}
</svelte:head>

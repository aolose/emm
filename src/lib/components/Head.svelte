<script>
	import { h } from '$lib/store';

	let {
		title,
		description,
		keywords,
		canonical = '',
		ogImage = '',
		noindex = false,
		ogType = 'website',
		children
	} = $props();
</script>

<svelte:head>
	<title>{title || $h.title || ''}</title>

	<meta name="description" content={description || $h.desc || ''} />
	<meta name="keywords" content={keywords || $h.key || ''} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{/if}
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}

	<!-- Open Graph -->
	<meta property="og:site_name" content={$h.title || ''} />
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={title || $h.title || ''} />
	<meta property="og:description" content={description || $h.desc || ''} />
	{#if canonical}
		<meta property="og:url" content={canonical} />
	{/if}
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />

	<link rel="alternate" type="application/rss+xml" href="/feed/rss" title="RSS" />
	<link rel="alternate" type="application/atom+xml" href="/feed/atom" title="Atom" />
	<link rel="alternate" type="application/feed+json" href="/feed/json" title="JSON Feed" />
	{@render children?.()}
</svelte:head>
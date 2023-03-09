<script>
	import { page } from '$app/stores';
	import Posts from '$lib/components/post/list.svelte';
	import { onMount } from 'svelte';
	import Head from '$lib/components/Head.svelte';
	import { seo } from '$lib/store';

	export let data;
	const { d } = data;
	const {
		params: { tag }
	} = $page;

	onMount(() => {
		sessionStorage.hasBack = 1;
	});
</script>

<Head title={`${$seo.title} - ${tag}`} />
<Posts {d} name={`tag/${tag}`}>
	<a href="/tags">{tag}</a>
</Posts>

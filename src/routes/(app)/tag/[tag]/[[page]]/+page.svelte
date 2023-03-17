<script>
	import Posts from '$lib/components/post/list.svelte';
	import { onMount } from 'svelte';
	import Head from '$lib/components/Head.svelte';
	import { h } from '$lib/store';

	export let data;
	let tag,d,p
	$:{
		({d,p}=data)
		tag = p.tag
	}

	onMount(() => {
		sessionStorage.hasBack = 1;
	});
</script>

<Head title={`${$h.title} - ${tag}`} />
<Posts {d} name={`tag/${tag}`} path={`/${tag}`}>
	<a href="/tags">{tag}</a>
</Posts>

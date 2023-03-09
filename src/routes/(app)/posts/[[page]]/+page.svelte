<script>
	import Posts from '$lib/components/post/list.svelte';
	import { onMount } from 'svelte';
	import Head from '$lib/components/Head.svelte';
	import { seo } from '$lib/store';
	onMount(() => {
		sessionStorage.hasBack = 1;
	});
	export let data = {};
</script>

<Head title={`${$seo.title} - Posts`} />
<Posts d={data.d} name="posts">Posts</Posts>

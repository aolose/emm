<script>
    import {page} from '$app/stores';
    import Posts from "$lib/components/post/list.svelte"
    import {onMount} from "svelte";

    export let data
    const {d} = data
    const {params: {tag}} = $page

    onMount(() => {
        sessionStorage.hasBack = 1
    })

</script>
<svelte:head>
    <title>Err - {tag}</title>
</svelte:head>
<Posts d={d} name={`tag/${tag}`} >
    <a href="/tags">{tag}</a>
</Posts>
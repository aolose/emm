<script>
    import Posts from "$lib/components/postList/list.svelte"

    export let data = {}
</script>
<svelte:head>
    <title>Err - Posts</title>
</svelte:head>
<Posts d={data.d} name="posts">Posts</Posts>
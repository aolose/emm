<script>
    import Posts from "$lib/components/post/list.svelte"
    import {onMount} from "svelte";
    onMount(()=>{
        sessionStorage.hasBack=1
    })
    export let data = {}
</script>
<svelte:head>
    <title>Err - Posts</title>
</svelte:head>
<Posts d={data.d} name="posts">Posts</Posts>
<script>
    import {upDownScroller} from "$lib/utils";

    export let down = 0
    let a = 0
    const ons = upDownScroller(v => down = v)
</script>
<svelte:body on:scroll|capture={ons}/>

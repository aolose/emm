<script>
    import Cm from '$lib/components/comment/cm.svelte'
    import Itm from "./itm.svelte";
    import {onMount} from "svelte";
    import {req} from "$lib/req";
    import Pg from "$lib/components/pg.svelte";
    import Ld from "$lib/components/loading.svelte";
    import {method} from "$lib/enum";

    let page = 1;
    let total = 1;
    let ld = 0;

    function go(n = 1) {
        page = n;
        req("cmLs", {page, slug}, {method: method.GET})
            .then(({
                       total: t, page: p, items: d
                   }) => {
                total = t;
                page = p;
                console.log(d)
                ls = d;
            });
    }

    onMount(() => {
        go();
    });
    let ls = [];
    let user = {}

    function done(a) {
        ls = [a, ...ls].slice(0, 10)
    }

    export let slug = ''
</script>
<div class="a">
    {JSON.stringify(user)}
    {#each ls as i}
        <Itm d={i} {user}/>
    {/each}
    {#if total > 1}
        <Pg {page} {total} {go}/>
    {/if}
    <Ld act={ld}/>
</div>
<Cm {slug} bind:user done={done}/>
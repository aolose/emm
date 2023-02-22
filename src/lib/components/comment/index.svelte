<script>
    import Cm from '$lib/components/comment/cm.svelte'
    import Itm from "./itm.svelte";
    import {onMount} from "svelte";
    import {req} from "$lib/req";
    import Pg from "$lib/components/pg.svelte";
    import Ld from "$lib/components/loading.svelte";
    import {method} from "$lib/enum";
    import {randNm, rndAr} from "$lib/utils";
    let page = 1;
    let total = 1;
    let ld = 0;
    const cur = {
        act: 0,
        topic: 0,
        reply: 0,
        name: '',
        avatar: '',
        set(topic, reply) {
            cur.topic = topic
            cur.reply = reply
        },
        refresh() {
            cur.name = randNm()
            cur.avatar = localStorage.av = rndAr(avLs)
        }
    }

    function go(n = 1) {
        page = n;
        req("cmLs", {page, slug}, {method: method.GET})
            .then(({
                       total: t, items: d
                   }) => {
                total = t;
                ls = d;
            });
    }

    const avLs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    onMount(() => {
        cur.name = localStorage.nm || randNm()
        cur.avatar = localStorage.av || rndAr(avLs)
        go();
    });
    let ls = [];
    const user = {
        name: '',
        avatar: 0,
        set(name, avatar) {
            user.name = name
            user.avatar = avatar
        }
    }

    function done(a) {
        if (a) {
            user.set(cur.name, cur.avatar)
            ls = [a, ...ls].slice(0, 5)
        }
    }

    $:{
        if (cur.name) localStorage.nm = cur.name
        if (cur.avatar) localStorage.av = cur.avatar
    }
    const rm = i => () => {
        ls = ls.filter(a => a !== i)
    }
    export let slug = ''
</script>
<div class="a">
    {#each ls as i}
        <Itm d={i} {cur} {user} remove={rm(i)}/>
    {/each}
    {#if total > 1}
        <div class="p">
            <Pg {page} {total} {go}/>
        </div>
    {/if}
    <Ld act={ld}/>
</div>
<Cm av={avLs} {slug} {cur} {user} done={done}/>
<style>
    .p {
        display: flex;
        justify-content: center;
    }
</style>

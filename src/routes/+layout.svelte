<script>
    import Mobile from "$lib/components/Mobile.svelte";
    import {seo, status} from "$lib/store";
    import {page} from "$app/stores";
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import {adminRedirect} from "$lib/utils";

    function getInf() {
        const base = {...$seo};
        const cur = $seo[$page.route.id];
        return {...base, ...(cur || {})};
    }

    export let data
    const {d} = data
    let o = getInf();
    let title, key, desc
    $:{
        ({title, key, desc} = o)
    }
    const jump = s => {
        const path = $page.url.pathname
        const rd = adminRedirect(s, path)
        if (rd) goto(rd, {replaceState: true})
    }
    onMount(() => {
        status.set(d.statue);
        status.subscribe(s => jump(s));
        return seo.subscribe(() => {
            o = getInf();
        });
    })
</script>
<svelte:head>
    <title>{title}</title>
    <meta name="keywords" content={key}>
    <meta name="description" content={desc}>
</svelte:head>
<slot/>
<Mobile/>
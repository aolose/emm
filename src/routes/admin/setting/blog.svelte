<script>
    import {onMount} from "svelte";
    import {sys} from "./sys";
    import Card from "./Card.svelte";
    import Ipt from "./Ipt.svelte";
    import {getErr, trim} from "$lib/utils";
    import {req} from "$lib/req";
    import {seo} from "$lib/store";

    let url;
    let nm;
    let bio;
    let msg;
    let ld;
    let err = 0;
    let act;
    let key;
    let mx = 1000;
    let desc;
    onMount(() => sys.subscribe(a => {
        nm = a.blogName;
        bio = a.blogBio;
        url = a.blogDomain;
        key = a.seoKey;
        desc = a.seoDesc;
        mx = a.maxFireLogs || 1000;
    }));
    const save = () => {
        ld = 1;
        const o = {
            seoKey: key,
            maxFireLogs: mx,
            seoDesc: desc,
            blogName: nm, blogBio: bio, blogDomain: url
        };
        req("sys", o).then(() => {
            act = 1;
            sys.update(a => ({...a, ...o}));
            err = 0;
            msg = "update success";
            seo.update(a => ({...a, title: nm, key: key, desc: desc}));
        }).catch(e => {
            act = 1;
            err = 1;
            msg = getErr(e);
        }).finally(() => ld = 0);
    };
    $:{
        url = trim(url);
        nm = trim(nm);
        bio = trim(bio);
        desc = trim(desc, true);
        key = trim(key);
        mx = Math.abs(+mx) || 1000
        if (act) {
            setTimeout(() => act = 0, 2e3);
        }
    }
</script>
<Card {act} {msg} {err} title="Blog" {save} {ld}>
    <Ipt label="Domain" bind:value={url} placeholder="www.blog.example"/>
    <Ipt label="Name" bind:value={nm} placeholder="my blog"/>
    <Ipt label="Bio" bind:value={bio} placeholder="www.blog.example"/>
    <Ipt label="Keywords" bind:value={bio} placeholder="photos,foods,.ect"/>
    <Ipt box label="Description" bind:value={bio} placeholder="description for seo"/>
    <Ipt label="Max number of logs" bind:value={mx}/>
</Card>
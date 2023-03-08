<script>
    import {onMount} from "svelte";
    import {sys} from "./sys";
    import Card from "./Card.svelte";
    import Ipt from "./Ipt.svelte";
    import {req} from "$lib/req";
    import {getErr, trim, watch} from "$lib/utils";

    let pw;
    let pw2;
    let msg;
    let un;
    let ld;
    onMount(() => sys.subscribe(a => {
        un = a.admUsr;
        pw = a.admPwd;
    }));
    let err
    let act
    const w = watch(act)
    $:{
        un = trim(un)
        w(() => {
            if (act) setTimeout(() => act = 0, 2e3)
        }, act)
    }
    const save = () => {
        act = 0
        err = 1
        msg = ''
        if (!un) msg = 'please enter user name'
        if (!pw) msg = 'please enter password'
        if (pw !== pw2) {
            msg = 'two passwords do not match'
        }
        if (msg) {
            act = 1
        } else {
            err = 0
            ld = 1
            req('setAdmin', {pwd: pw, usr: un}, {encrypt: true}).then(() => {
                un = pw = pw2 = ''
                err = 0
                msg = 'update success'
                act = 1
            }).catch(e => {
                err = 1
                msg = getErr(e)
                act = 1
            }).finally(() => ld = 0)
        }
    };
</script>
<Card {act} {msg} {err} title="Admin User" {save} {ld}>
    <Ipt label="User Name" bind:value={un} placeholder="name"/>
    <Ipt label="Password" bind:value={pw} password placeholder="password"/>
    <Ipt label="Confirm Password" password bind:value={pw2} placeholder="confirm password"/>
</Card>
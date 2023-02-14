<script>
    import Ava from '$lib/components/post/ava.svelte'
    import {time,getColor} from "$lib/utils";

    export let d = {}
    export let user = {}
    const own = d._own
    const isAdm = d.isAdm
    const name = isAdm ? 'admin' : own ? user.name : d._name
    const avatar = isAdm ? -1 : own ? user.avatar : d._avatar
</script>
<div class="a">
    <div>
        <Ava size="50" idx={avatar}/>
        <p style={`color:${isAdm?'#ff5722':getColor(name)}`}>{name}</p>
    </div>
    <div class="c">
        <p>{d.content}</p>
        <div class="t">
            <span>{time(d.createAt)}</span>
            {#if d.save}
                <span class="e">last edit at {time(d.save)}</span>
            {/if}
        </div>
    </div>
</div>
<style lang="scss">

</style>
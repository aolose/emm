<script>
    import Menu from './sideMenu.svelte';
    import Confirm from '$lib/components/confirm.svelte'
    import {onMount} from "svelte";
    import {status} from "$lib/store";
    import {goto} from "$app/navigation";

    export let data
    const {d} = data
    onMount(() => {
        console.log(d)
        status.set(+d)
        status.subscribe(s => {
            if (!s) goto('/login', {replaceState: true})
        })
    })

</script>

<div class="a">
    <div class="b">
        <Menu/>
    </div>
    <div class="c">
        <slot/>
    </div>
    <Confirm/>
</div>

<style lang="scss">
  .a {
    height: 100%;
    width: 100%;
    display: flex;
  }

  .b,
  .c {
    height: 100%;
  }

  .b {
    z-index: 1;
    width: 72px;
  }

  .c {
    background: var(--bg1);
    flex: 1;
  }
</style>

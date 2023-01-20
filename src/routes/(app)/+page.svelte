<script>
    import Bird from "$lib/components/brid.svelte"
    import {onDestroy, onMount} from "svelte";
    import {msg} from "$lib/store";
    import {slidLeft} from "$lib/transition";
    import Ctx from '$lib/components/ctx.svelte'

    let c = 0;
    let h = 0;
    const m = [
        'welcome to my blog !'
    ]
    let t, t0, a
    onMount(() => {
        a = setTimeout(() => h = 1, 300)
        t = setInterval(function () {
            const v = (c++) % m.length
            msg.set(m[v])
        }, 1e3 * 10)
    })
    onDestroy(() => {
        clearInterval(t)
        clearTimeout(t0)
        clearTimeout(a)
    })
</script>
<svelte:head>
    <title>Err</title>
</svelte:head>
<Ctx/>
<div class="b">
    <div class="bb">
        {#if h}
            <Bird/>
        {/if}
    </div>
    <div class="mu">
        <a href="/posts" transition:slidLeft|local>Articles -></a>
    </div>
</div>
<style lang="scss">
  @import "../../lib/break";

  .mu {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 30px;
  }

  a {
    text-align: left;
    display: block;
    font-size: 18px;
    font-family: 'Architects Daughter', -apple-system,
    BlinkMacSystemFont, PingFang SC, Helvetica Neue, STHeiti,
    Microsoft Yahei, Tahoma, Simsun, sans-serif;;
    position: relative;
    opacity: .8;
    white-space: nowrap;
    overflow: hidden;
    color: #fff;
    transition: .3s ease-in-out;

    &:hover {
      opacity: 1;
      color: #ffffff;
    }
  }

  .b {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-bottom: 100px;
  }

  .bb {
    width: 50%;
    max-width: 80px;
  }
</style>
<script>
    import Ava from '$lib/components/post/ava.svelte'
    import {time, getColor} from "$lib/utils";
    import { slide } from "svelte/transition";
    let page = 1
    let total = 1
    export let d = {}
    export let user = {}
    const own = d._own
    const isAdm = d.isAdm
    const name = isAdm ? 'admin' : own ? user.name : d._name
    const avatar = isAdm ? -1 : own ? user.avatar : d._avatar
</script>
<div class="a" transition:slide>
    <div class="b">
        <Ava size="36" idx={avatar}/>
        <p style={`color:${isAdm?'#ff5722':getColor(name)}`}>{name}</p>
    </div>
    <div class="c">
        <p>{d.content}
            sadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasdsadsadwasd
        </p>
        <div class="n">
            <div class="u">
                <button class="icon i-reply"></button>
                {#if d._own === 1}
                    <button class="icon i-ed"></button>
                {/if}
                {#if d._own}
                    <button class="icon i-del"></button>
                {/if}
            </div>
            <div class="t">
                <span>{time(d.createAt)}</span>
                {#if d.save}
                    <span class="e">last edit at {time(d.save)}</span>
                {/if}
            </div>
        </div>
    </div>
</div>
<style lang="scss">
  .a {
    display: flex;
    margin-bottom: 15px;
  }

  .b {
    padding: 15px 10px 0 0;
    width: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;

    p {
      word-break: break-all;
      font-size: 12px;
    }
  }

  .c {
    border: 1px solid var(--bg5);
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg2);

    p {
      flex-grow: 1;
      padding: 10px;
      white-space: normal;
      word-break: break-all;
      color: #a6afb4;
      line-height: 1.5;
      font-size: 15px;
    }
  }

  .t {
    display: flex;
    justify-content: flex-end;
    font-size: 12px;
    opacity: .6;
    flex: 1;
    align-items: center;
  }

  .u {
    display: flex;
    align-items: center;
  }

  .n {
    padding: 0 10px 5px;
    display: flex;
    flex-wrap: wrap;

    button {
      margin-right: 5px;
      padding: 5px;
      opacity: .5;

      &:hover {
        opacity: 1;
      }
    }
  }
</style>
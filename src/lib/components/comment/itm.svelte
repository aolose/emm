<script>
    import Ava from "$lib/components/post/ava.svelte";
    import {time} from "$lib/utils";
    import {slide} from "svelte/transition";
    import Cm from './cm.svelte'
    import Pg from '$lib/components/pg.svelte'
    import {req} from "$lib/req";
    import {method} from "$lib/enum";
    import {confirm} from "$lib/store";

    export let d = {};
    export let user = {};

    export let cur = {}
    export let topic
    const own = d._own;
    const isAdm = d.isAdm;
    $:name = own === 1 && user.name || d._name;
    $:avatar = own === 1 && user.avatar || d._avatar;
    let page = 1;
    export let done
    export let remove

    function reply() {
        if (cur.reply === d.id) {
            cur.set({reply: 0})
        } else {
            cur.set({
                topic: topic || d.id,
                reply: d.id
            })
        }
    }

    function ok(a) {
        d._cms = {
            items: (d._cms?.items || []).concat(a),
            total: d.total || 1
        }
        cur.set({reply: 0})
    }

    function del(id) {
        return () => {
            confirm('sure to delete?').then((a) => {
                if (a) req('cm', id, {method: method.DELETE}).then((err) => {
                    if (!err) {
                        remove && remove(id)
                    }
                })
            })
        }
    }

    function go(n) {
        page = n
        req('cmLs', {
            page,
            topic: d.id
        }, {method: method.GET}).then(a => {
            d._cms = a
        })
    }

    let editMod = false
    $:{
        if (editMod) {
            d.done = a => {
                d = {...d, ...a}
                editMod = false
            }
            d.close = () => {
                editMod = false
            }
        }
    }
    const rm = i => () => {
        const itm = d?._cms?.items
        if (itm) {
            d._cms.items = itm.filter(a => a !== i)
        }
    }
</script>
<div class="a" class:m={topic} transition:slide>
    {#if !topic}
        <div class="b">
            <div class="v">
                <Ava size={topic?16:32} idx={avatar}/>
            </div>
            <p style={`${isAdm?'color:#ff5722':''}`}>{name}</p>
        </div>
    {/if}
    <div class="c">
        {#if editMod}
            <div class="e" transition:slide>
                <Cm edit={d}/>
            </div>
        {:else }
            <p>
                {#if topic}
                    <label>
                        <span style={`${isAdm?'color:#ff5722':''}`}>{name}: </span>
                    </label>
                {/if}
                {#if d._reply}<span>@{d._reply}</span>{/if}
                {d.content}
            </p>
            <div class="n">
                <div class="u">
                    <button class="icon i-reply" on:click={reply}></button>
                    {#if own === 1}
                        <button class="icon i-ed" on:click={()=>editMod=1}></button>
                    {/if}
                    {#if own}
                        <button class="icon i-del" on:click={del(d.id)}></button>
                    {/if}
                </div>
                <div class="t">
                    {#if d.save}
                        <span class="e">last edit at {time(d.save)}</span>
                    {/if}
                    <span>{time(d.createAt)}</span>
                </div>
            </div>
        {/if}
    </div>
    {#if (topic ? cur.topic === topic : cur.topic === d.id) && cur.reply === d.id}
        <div class="r" transition:slide>
            <Cm {user} {cur} done={done||ok} reply={{
           topic:topic||d.id,
           cm:d.id,
           name:name
       }}/>
        </div>
    {/if}
    {#if !topic}
        <div class="ls">
            {#each (d._cms?.items || []) as i}
                <svelte:self d={i} {cur} {user} done={ok} topic={d.id} remove={rm(i)}/>
            {/each}
            {#if d._cms?.total > 1}
                <div class="p">
                    <Pg {page} total={d._cms?.total||1} {go}/>
                </div>
            {/if}
        </div>
    {/if}
</div>
<style lang="scss">
  .e {
    margin: 10px;
  }

  .p {
    display: flex;
    justify-content: flex-end;
  }

  .ls {
    width: 100%;
    padding-left: 80px;
  }

  .r {
    width: 100%;
    padding-left: 80px;
  }

  .a {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 15px;
  }

  .m {
    margin: 10px 0;
    border-radius: 4px;
    background: var(--bg);
    border: 1px solid var(--bg5);
    flex-direction: column;

    .r {
      padding-left: 0;
    }

    .n {
      button {
        padding: 0;
      }
    }

    .c {
      border: none;
      background: none;

      p {
        color: #8396af;
        display: flex;
        padding: 0 5px;
        font-size: 13px;
        line-height: 2;

        & > span {
          padding: 0 5px;
          color: var(--darkgrey-h);
        }
      }
    }
  }

  label {
    display: inline-flex;
    align-items: center;

    span {
      font-size: inherit;
      line-height: inherit;
      padding: 0 5px;
    }
  }

  .b {
    padding: 15px 10px 0 0;
    width: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;

    p {
      margin-top: 5px;
      word-break: break-all;
      font-size: 12px;
    }
  }

  .c {
    border: 1px solid var(--bg5);
    border-radius: 4px;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg);

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

    span {
      padding-left: 10px;
    }
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
      padding: 5px 0;
      opacity: .5;
      left: -5px;

      &:hover {
        opacity: 1;
      }
    }
  }
</style>
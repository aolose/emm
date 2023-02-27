<script>
  import Cm from "$lib/components/comment/cm.svelte";
  import Item from "./item.svelte";
  import { watch } from "$lib/utils";
  import { req } from "$lib/req";
  import { cmStatus, method } from "$lib/enum";
  import { confirm } from "$lib/store";
  import Ld from '$lib/components/loading.svelte'
  export let d = {};
  export let filter;
  let ban = 0;
  const wip = watch(d.ip);
  const wid = watch(d.id);
  let ls = [];
  let page = 1;
  let total = 1;
  let ld = 0;
  $:{
    wid(() => {
      ls = [];
      ld = 1;
      page=1
      total=1
      req("cmLs", {
        topic: d.id,
        page
      }, { method: method.GET }).then(({ items, total: t, page: p }={}) => {
        total = t;
        page = p;
        ls = items||[];
      }).finally(() => {
        ld = 0;
      });
    }, d.id);
    wip(() => {
      ban = 0;
      const { ip } = d;
      if (ip) {
        req("bip", ip).then(a => {
          if (a && ip === d.ip) {
            ban = 1;
          }
        });
      }
    }, d.ip);
  }
  const set = m => () => {
    const a = d;
    req("cm", { id: a.id, state: m, isAdm: 1 }).then(a => {
      a.state = m;
      filter();
    });
  };

  const del = id => () => {
    confirm("sure to delete?").then(a => {
      if (a) req("cm", id, { method: method.DELETE }).then(() => filter(id));
    });
    filter(0);
  };
</script>
<div class="a">
  <Item detail={1} {d} />
  <Cm admin={1} reply={{
          topic:d.topic||d.id,
           cm:d.id,
           name:d._name
  }} />
  <div class="b">
    <button class="icon i-ip" class:act={ban}></button>
    {#if d.state === cmStatus.Reject}
      <button class="icon i-fbi" on:click={set(cmStatus.Reject)}></button>
    {/if}
    {#if d.state !== cmStatus.Approve}
      <button class="icon i-ok" on:click={set(cmStatus.Approve)}></button>
    {/if}
    <button class="icon i-del" on:click={del(d.id)}></button>
  </div>
  <div class="l">
    {#each ls as i}
      <Item topic={d.id} d={i} />
    {/each}
    <Ld act={ld}/>
  </div>
</div>
<style lang="scss">
  .a {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .b {
    position: absolute;
    right: 10px;
    top: 10px;
    padding: 10px;
  }

  button {
    padding: 0 2px;
    transition: .1s;
    opacity: .5;
  }

  .act, button:hover {
    opacity: 1;

    &.i-ip {
      color: red;
    }

    &.i-fbi {
      color: orange;
    }

    &.i-ok {
      color: greenyellow;
    }

    &.i-del {
      color: #fff;
    }
  }
</style>
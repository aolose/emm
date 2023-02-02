<script>
  import { permission, pmsName } from "$lib/enum";
  import { onMount } from "svelte";
  import { method } from "$lib/enum";
  import { req } from "$lib/req";
  import { time } from "$lib/utils";
  import Ld from "$lib/components/loading.svelte";
  import Table from "./table.svelte";
  import Panel from "./panel.svelte";
  import Pg from "$lib/components/pg.svelte";

  let ta = 0;
  let page = 1;
  let total = 1;
  let items = [];
  let loading = 0;
  let edit;


  const go = (n = 1) => {
    loading = 1;
    items = [];
    page = n;
    req(["require", "code"][ta], { page }, { method: method.GET })
      .then(d => ({ total, items } = d))
      .finally(() => loading = 0);
  };


  onMount(() => {
    go();
  });

  function add() {
    edi();
  }

  function edi(v) {
    edit(ta, v).then(a => {
      if(!a)return
      const d = items.find(n => n.id === a.id);
      if (d) Object.assign(d, a);
      else items.unshift(a);
      items = [...items];
    });
  }

  let cols = [];
  $:cols = [
    [
      { check: true },
      { name: "name", key: "name" },
      { name: "type", cell: ({ type }) => pmsName[permission[type]] },
      { name: "create at", cell: ({ createAt }) => time(createAt) },
      { name: "edit", btn: a => edi(a) }
    ],
    [
      { check: true },
      { name: "code", key: "code" },
      { name: "type", cell: ({ type }) => pmsName[permission[type]] },
      { name: "expire", cell: ({ expire }) => time(expire) },
      { name: "create at", cell: ({ createAt }) => time(createAt) },
      { name: "times", cell: ({ times }) => times === -1 ? "forever" : times },
      {del:1,detail:1}
    ]
  ][ta];
  let ids = new Set();
  const act = (n) => () => {
    if (ta !== n) {
      ta = n;
      go();
    }
  };
</script>
<div class="x">
  <div class="a">
    <div class="t">
      <div class="v">
        <button class:act={ta===0} on:click={act(0)}>token data</button>
        <button class:act={ta===1} on:click={act(1)}>tickets</button>
      </div>
      <div class="o">
        <button class="icon i-add" on:click={add}></button>
        <button class="icon i-del"></button>
      </div>
    </div>
    <div class="ls">
      <Table
        bind:items={items}
        cols={cols}
        bind:sel={ids}
      />
    </div>
    <Ld act={loading} />
    <Pg {page} {total} {go} />
  </div>
  <Panel bind:edit />
</div>


<style lang="scss">
  .t {
    justify-content: space-between;
    display: flex;
    padding: 12px 20px;
  }

  .v, .o {
    display: flex;
  }

  .v {
    border-radius: 4px;
    button {
      text-align: center;
      width: 100px;
      border-radius: 4px 0 0 4px;
      opacity: .8;
      font-size: 13px;
      color: #5f768f;
      padding: 5px;
      border: currentColor 1px solid;
      border-right-width:0 ;
      &+button{
        border-right-width:1px;
        border-left: 0;
        border-radius: 0 4px 4px 0;
      }
      &:hover {
        opacity: 1;
      }
    }

    .act {
      color: #fff;
      border-color: transparent;
      background: var(--darkgrey-h);
    }
  }

  .x {
    height: 100%;
    background: var(--bg3);
  }

  .a {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg1);
    padding-bottom: 15px;
  }

  .ls {
    flex: 1;
    overflow: auto;
  }
</style>
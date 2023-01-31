<script>
  import { permission, pmsName } from "$lib/enum";
  import { onMount } from "svelte";
  import { method } from "$lib/enum";
  import { req } from "$lib/req";
  import { sort, time } from "$lib/utils";
  import Ld from "$lib/components/loading.svelte";
  import Table from "./table.svelte";
  import Panel from './panel.svelte'

  let page = 1;
  let total = 1;
  let items = [];
  let ver = 0;
  let loading = 0;


  function getReq(n = 1) {
    loading = 1;
    items = [];
    page = n;
    req("require", { page }, { method: method.GET })
      .then(d => ({ total, items } = d))
      .finally(() => loading = 0);
  }

  function getTks() {
    loading = 1;
    items = [];
    req("code", ver, { method: method.GET })
      .then(a => {
        const { version, data, patch } = a;
        ver = version;
        let s = data || patch;
        if (data) {
          if (patch === undefined) items = data;
          else {
            items = items.concat(data);
            if (patch) {
              const f = new Set(patch.split(","));
              items = items.filter(a => !f.has(a.code));
            }
          }
        }
        if (s) sort([...items], "createAt", 1);
      })
      .finally(() => loading = 0);
  }

  onMount(() => {
    getReq();
  });

  const rqs = [
    { id: 0, name: "a", type: permission.Post, createAt: Date.now() },
    { id: 1, name: "aa", type: permission.Post, createAt: Date.now() },
    { id: 2, name: "ab", type: permission.Post, createAt: Date.now() },
    { id: 3, name: "ac", type: permission.Post, createAt: Date.now() },
    { id: 4, name: "ad", type: permission.Post, createAt: Date.now() },
    { id: 5, name: "ae", type: permission.Post, createAt: Date.now() },
    { id: 6, name: "af", type: permission.Post, createAt: Date.now() },
    { id: 7, name: "ag", type: permission.Post, createAt: Date.now() },
    { id: 8, name: "ah", type: permission.Post, createAt: Date.now() },
    { id: 9, name: "aff", type: permission.Post, createAt: Date.now() }
  ];

  const cols = [
    { name: "name", key: "name" },
    { name: "permission", cell: ({ type }) => pmsName[type] },
    { name: "create at", cell: ({ createAt }) => time(createAt) }
  ];
</script>
<div class="x">
  <div class="a">
    <div class="t">
      <div class="v">
        <input />
        <button class="icon i-search"></button>
      </div>
      <div class="o">
           <button class="icon i-add"></button>
           <button class="icon i-del"></button>
      </div>
    </div>
    <div class="ls">
      <Table
        items={rqs}
        cols={cols}
      />
    </div>
    <Ld act={loading} />
  </div>
  <Panel/>
</div>


<style lang="scss">
  .t{
    justify-content: space-between;
    display: flex;
    padding: 20px;
  }
  .v,.o{
    display: flex;
  }
  .x {
    height: 100%;
      background: var(--bg3);
  }

  .a {
    max-width: 600px;
      height: 100%;
      background: var(--bg1);
  }
</style>
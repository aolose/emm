<script>
  import Itm from "./itm.svelte";
  import { onMount } from "svelte";
  import { req } from "$lib/req";
  import Pg from "$lib/components/pg.svelte";
  import Ld from "$lib/components/loading.svelte";
  import { method } from "$lib/enum";

  let page = 1;
  let total = 1;
  let ld = 0;

  function go(n = 1) {
    page = n;
    req("cmLs", { page, slug }, { method: method.GET })
      .then(({
               total: t, page: p, items: d
             }) => {
        total = t;
        page = p;
        ls = d;
      });
  }

  onMount(() => {
    go();
  });
  export let slug ='';
  export let user = {};
  let ls = [];
</script>
<div class="a">
  {#each ls as i}
    <Itm d={i} {user} />
  {/each}
  {#if total > 1}
    <Pg {page} {total} {go} />
  {/if}
  <Ld act={ld}/>
</div>
<style lang="scss">

</style>
<script>
  import G from './geo.svelte'
  import B from './blog.svelte'
  import A from './acc.svelte'
  import C from './clear.svelte'
  import R from './res.svelte'
  import { onMount } from "svelte";
  import { load } from "./sys";
  onMount(load)
</script>
<div class="m">
  <B/>
  <G/>
  <A/>
  <C/>
  <R/>
</div>
<style lang="scss">
  .m{
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    height: 100%;
    width: 100%;
  }
</style>
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
  <R/>
  <C/>
</div>
<style lang="scss">
  @import "../../../lib/break";
  .m{
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    @include s(){
      display: block;
      overflow: auto;
      padding: 10px 5px;
    }
  }
</style>
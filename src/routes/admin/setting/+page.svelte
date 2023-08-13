<script>
  import G from "./geo.svelte";
  import B from "./blog.svelte";
  import A from "./acc.svelte";
  import T from "./about.svelte";
  import C from "./backup.svelte";
  import R from "./res.svelte";
  import P from "./puv.svelte";
  import { onMount } from "svelte";
  import { load } from "./sys";

  onMount(load);
</script>

<div class="m">
  <P />
  <R />
  <T />
  <C />
  <G />
  <A />
  <B />
</div>

<style lang="scss">
  @import '../../../lib/break';

  .m {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: auto;
    padding: 10px 5px;
    flex-direction: column;
    @include s() {
      flex-direction: row;
    }
  }
</style>

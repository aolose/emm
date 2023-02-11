<script>
  import Itm from "./itm.svelte";

  export let postId = -1;
  let ls = [];
  export const load = (d) => {
    if (d) {
      ls = [d, ...ls];
    }
  };
</script>
<div class="a">
  {#each ls as i}
    <Itm d={i} />
  {/each}
</div>
<style lang="scss">

</style>
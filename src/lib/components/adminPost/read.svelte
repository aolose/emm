<script>
  import { slide } from "svelte/transition";
  import Pg from '$lib/components/pg.svelte'
  export let act = 0;


</script>


{#if act}
  <div transition:slide>

    <Pg/>
  </div>
{/if}

<style lang="scss">

</style>
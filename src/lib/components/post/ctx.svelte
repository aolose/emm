<script>
    import {fade} from "svelte/transition";
</script>
<div class="ctx" transition:fade>
    <slot>
    </slot>
</div>
<style lang="scss">
  @import "../../break";
  .ctx {
    flex: 1;
    display: flex;
    width: 90%;
    flex-wrap: wrap;
    margin:  0 auto;
    align-content: baseline;
    @include s(){
      width: 98%;
    }
  }
</style>
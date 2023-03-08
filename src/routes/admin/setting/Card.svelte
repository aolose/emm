<script>
  import Tip from "./Tip.svelte";
  import Ld from "$lib/components/loading.svelte";

  export let ld;
  export let msg;
  export let act;
  export let err;
  export let title
  export let save
</script>
<div class="a">
  <Tip {act} {err} text={msg} />
  <div class="t">
    <h1>{title}</h1>
    {#if save}
      <button on:click={save}>Save</button>
    {/if}
  </div>
  <slot></slot>
  <Ld act={ld} />
</div>
<style lang="scss">
  @import "../../../lib/break";
  .a {
    border: 1px solid #000;
    width: 400px;
    margin: 10px 0 0 10px;
    padding-bottom: 20px;
    background: var(--bg2);
    border-radius: 4px;
    box-shadow: rgba(0, 0, 0, .1) 0 2px 4px -1px;
    @include s(){
      width: 96%;
      margin: 5px auto;
    }
  }

  .t {
    align-items: center;
    margin-bottom: 20px;
    background: rgba(100, 110, 120, .05);
    border-bottom: 1px solid rgba(10, 20, 40, .1);
    padding: 8px 30px;
    display: flex;
    justify-content: space-between;
  }

  h1 {
    font-weight: 200;
    color: var(--darkgrey-h);
    font-size: 18px;
  }

  button {
    background: rgba(50, 90, 170, .5);
    padding: 3px 10px;
    right: -10px;
    border-radius: 3px;
    transition: .2s ease-in-out;
    &:hover{
      background: rgba(50, 90, 170, .8);
    }
  }
</style>
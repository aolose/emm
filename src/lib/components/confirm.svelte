<script>
  import { onMount } from "svelte";
  import { confirmStore } from "$lib/store";
  import { fade } from "svelte/transition";

  let cfg = {};
  onMount(() => {
    return confirmStore.subscribe(c => cfg = c);
  });

  function ok() {
    cancel();
    cfg.resolve?.(1);
  }

  function cancel(e) {
    confirmStore.set({ ...cfg, show: false });
    if (e) cfg.reject?.();
  }

  function esc(e) {
    if (cfg.show && e.code === "Escape") {
      cancel();
    }
  }

  let bo, bc;
  $:{
    if (cfg.show) (bo || bc)?.focus();
  }
</script>
<svelte:window on:keydown={esc} />
{#if cfg.show}
  <div class="a" class:act={cfg.show} transition:fade>
    <div class="b" on:click|stopPropagation={()=>0}>
      <p>{cfg.text}</p>
      <div class="n">
        {#if cfg.ok}
          <button bind:this={bo} on:click={ok}>{cfg.ok}</button>
        {/if}
        {#if cfg.cancel}
          <button bind:this={bc} on:click={cancel}>{cfg.cancel}</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .a {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    z-index: 99;
    backdrop-filter: blur(1px);
    background: rgba(23, 25, 30, .36);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .b {
    width: 280px;
    padding: 15px 10px 15px;
    border-radius: 6px;
    background: var(--bg2);
    box-shadow: rgba(0, 0, 0, .2) 2px 3px 9px;
  }

  .n {
    display: flex;
    justify-content: center;
  }

  p {
    padding: 0 10px;
    line-height: 2;
    font-size: 15px;
    margin: 0 0 20px;
    text-align: center;
  }

  button {
    cursor: pointer;
    margin: 0 15px;
    background: none;
    color: #b6bac0;
    padding: 4px 8px;
    min-width: 60px;
    border: 1px solid var(--darkgrey);
    background: rgba(255, 255, 255, 0.05);

    &:hover {
      color: #fff;
      background: var(--darkgrey-h);
    }
  }

  button + button {
    background: none;
  }
</style>
<script>
    import {onMount} from "svelte";
    import {confirmStore} from "$lib/store";
    import {fade} from "svelte/transition";

    let cfg = {}
    onMount(() => {
        return confirmStore.subscribe(c => cfg = c)
    })

    function ok() {
        cancel()
        cfg.resolve?.()
    }

    function cancel(e) {
        confirmStore.set({...cfg, show: false})
        if (e) cfg.reject?.()
    }
</script>
{#if cfg.show}
    <div class="a" on:click={cancel} class:act={cfg.show} transition:fade>
        <div class="b" on:click|stopPropagation>
            <p>{cfg.text}</p>
            <div class="n">
                {#if cfg.ok}
                    <button on:click={ok}>{cfg.ok}</button>
                {/if}
                {#if cfg.cancel}
                    <button on:click={cancel}>{cfg.cancel}</button>
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
    background: rgba(0, 0, 0, .36);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .b {
    width: 280px;
    padding: 20px;
    border-radius: 6px;
    background: var(--bg0);
    box-shadow: rgba(0, 0, 0, .2) 2px 3px 9px;
  }

  .n {
    display: flex;
    justify-content: flex-end;
  }

  p {
    line-height: 2;
    font-size: 15px;
    margin: 0 0 10px;
  }

  button {
    cursor: pointer;
    margin: 0 5px;
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
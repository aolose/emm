<script>
    import {marked} from 'marked'
    import {onMount} from "svelte";
    import {editPost} from "$lib/store";
    import {fade} from "svelte/transition";

    let el
    let patchMod = false
    let rd
    export let ctx = {}
    export let preview = false
    let title = ''
    let content = ''
    if (!preview) {
        title = ctx.title
        content = ctx.content
    }
    $:v = `<div class="${el?.className}">${marked.parse(content || '')}</div>`
    $:{
        if (patchMod && el) {
            rd(el, v)
        }
    }
    onMount(async () => {
        if (preview) {
            const d = await import('morphdom')
            rd = d.default
            patchMod = true
            return editPost.subscribe(p => {
                title = p.title_d
                content = p.content_d
            })
        }
    })
</script>
{#if title || content}
    <div class="a" class:p={preview} transition:fade>
        <div class="t">
            <h1>{title || ''}</h1>
        </div>
        <div class="c" bind:this={el}>
            {#if !preview}
                {@html v}
            {/if}
        </div>
    </div>
{/if}
<style lang="scss">
  .a {
    overflow: auto;
    padding: 20px;
    display: flex;
    height: 100%;
    flex-direction: column;

    :global {
      img {
        max-width: 100%;
        border-radius: 4px;
        margin: 10px;
      }
    }
  }

  .t {
    margin-bottom: 20px;
  }

  .p {
    padding: 10px 0 60px;
    overflow: hidden;

    .t {
      padding: 10px 30px;
    }

    .c {
      line-height: 2;
      padding: 1px 30px;
      flex: 1;
      overflow: auto;
    }
  }

  h1 {
    font-weight: 200;
    font-size: 40px;
  }

  .c {
  }
</style>
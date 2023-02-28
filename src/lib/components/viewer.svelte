<script>
  import { marked } from "marked";
  import { onMount, tick } from "svelte";
  import { editPost } from "$lib/store";
  import { fade } from "svelte/transition";
  import { highlight } from "../use";
  import { watch } from "$lib/utils";

  let el;
  let patchMod = false;
  let rd;
  export let ctx = {};
  export let preview = false;
  let title = "";
  let content = "";
  if (!preview) {
    title = ctx.title;
    content = ctx.content;
  }
  let v;
  const vw = watch(v);
  $:v = `<div class="${el?.className}">${marked.parse(content || "")}</div>`;
  $:{
    if (patchMod && el && rd) {
      rd(el, v);
    }
    vw(async () => {
      await tick();
      if (el) highlight(el);
    }, v);
  }
  onMount(async () => {
    if (preview) {
      const d = await import("morphdom");
      rd = d.default;
      patchMod = true;
      return editPost.subscribe(p => {
        title = p.title_d;
        content = p.content_d;
      });
    }
  });
</script>
{#if title || content}
  <div class="a" class:p={preview} transition:fade>
    {#if preview}
      <div class="t">
        <h1>{title || ''}</h1>
      </div>
    {/if}
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
      code {
        border-radius: 4px;
        overflow: hidden;
        display: block;
        background: rgba(0, 0, 0, .3);
        padding: 0 2px;
      }

      pre {
        & > code {
          max-width: 100%;
          overflow: auto;
          line-height: 1.4;
          font-size: 14px;
          box-shadow: rgba(0, 0, 0, .4) 0 2px 8px -5px;

          &:after {
            content: '';
            border: 3px solid rgba(188, 255, 148, 0.55);
            border-radius: 50%;
            position: absolute;
            top: 12px;
            left: 12px;
          }

          &:before {
            padding: 0 0 0 25px;
            font-size: 12px;
            content: attr(name);
            height: 30px;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            line-height: 30px;
            background: rgba(76,116,173, .23);
          }

          padding: 40px 10px 10px;
        }
      }

      p {
        color: #95a3b7;
        line-height: 2;
      }

      img {
        max-width: 100%;
        border-radius: 4px;
        margin: 10px 0;
      }
    }
  }

  .t {
    margin-bottom: 20px;
  }

  .p {
    background: var(--bg1);
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
<script>
  import P from "./panel.svelte";
  import T from "./item.svelte";
  import FileWin from "$lib/components/fileManager.svelte";
  import { req } from "$lib/req";
  import { onMount } from "svelte";
  import { method } from "$lib/enum";

  let ls = [];
  let name = "";
  let ok = false;
  let sel = {};

  function allTags() {
    req("tagLS").then(d => {
      ls = d;
    });
  }

  function add() {
    if (!ok) return;
    ss({ name })();
    name = "";
  }

  function ss(n) {
    return (e) => {
      let t;
      if (e) e.stopPropagation();
      if (sel === n) sel = {};
      else t = sel = n;
      setTag(t).then(d => {
        const t = ls.find(a => a.id === d.id);
        if (t) {
          Object.assign(t, d);
          ls = [...ls];
        } else ls = [d, ...ls];
        sel = {};
      });
    };
  }

  onMount(() => {
    allTags();
  });
  $:{
    name = name.replace(/[;, \t\s]/g, "");
    ok = name && !ls.find(a => a.name === name);
  }
  let setTag;

  function del(id) {
    req("tag", id, { method: method.DELETE }).then(() => {
      ls = ls.filter(a => a.id !== id);
    });
  }
</script>
<div class="c">
  <div class="a">
    <div class="r h" class:o={ok}>
      <span>Tags</span>
      <s></s>
      <input placeholder="tag name" bind:value={name} />
      <button class="icon i-add" on:click={add}></button>
    </div>
    <div class="ls">
      {#each ls as i}
        <T d={i} ck={ss(i)} sel={sel===i} del={del} />
      {/each}
    </div>
  </div>
  <P bind:setTag={setTag} />
</div>
<FileWin />


<style lang="scss">
  .c {
    width: 100%;
    height: 100%;
    display: flex;
    background: var(--bg3);
  }

  s {
    flex: 1;
  }

  .h {
    padding: 20px 30px;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--bg0);

    input {
      background: var(--bg0);
      margin-right: 10px;
    }

    button {
      border-radius: 4px;
      height: 34px;
      width: 34px;
      background: #6c7a93;
    }
  }

  .o {
    button {
      background: #1c93ff;
    }
  }

  .a {
    background: var(--bg1);
    width: 100%;
    max-width: 600px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .ls {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    overflow: auto;
    padding: 20px;
    align-content: flex-start;
  }

  .r {
    display: flex;
  }
</style>

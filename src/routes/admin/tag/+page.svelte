<script>
  import P from "./panel.svelte";
  import T from "./item.svelte";
  import FileWin from "$lib/components/fileManager.svelte";
  import { req } from "$lib/req";
  import { onMount } from "svelte";
  import { method } from "$lib/enum";
  import { small } from "$lib/store";
  import { trim } from "$lib/utils";

  let ls = [];
  let name = "";
  let ok = false;
  let sel = {};
  let view = 0;
  let sty;

  function allTags() {
    req("tagLS").then(d => {
      ls = d;
    });
  }

  function add() {
    if (!ok) return;
    view = 1;
    ss({ name })();
    name = "";
  }

  function ss(n) {
    return (e) => {
      view = 1;
      let t;
      if (e) e.stopPropagation();
      if (sel === n) sel = {};
      else t = sel = n;
      setTag(t).then(d => {
        if (d) {
          const t = ls.find(a => a.id === d.id);
          if (t) {
            Object.assign(t, d);
            ls = [...ls];
          } else ls = [d, ...ls];
        }
        view=0
        sel = {};
      });
    };
  }

  onMount(() => {
    allTags();
  });
  $:{
    sty = $small&&`transform:translate3d(${-view * 100 / 2}%,0,0)`;
    name = trim(name);
    ok = name && !ls.find(a => a.name === name);
  }
  let setTag;

  function del(id) {
    req("tag", id, { method: method.DELETE }).then(() => {
      ls = ls.filter(a => a.id !== id);
    });
  }
</script>
<div class="m">
  <div class="c" style={sty}>
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
    <P bind:setTag={setTag} close={()=>view=0} />
  </div>
  <FileWin w={100}/>
</div>
<style lang="scss">
  @import "../../../lib/break";

  .c {
    width: 100%;
    height: 100%;
    display: flex;
    background: var(--bg3);
    @include s() {
      transition: .3s ease-in-out;
      width: 200%;
    }
  }

  .m {
    height: 100%;
    width: 100%;
    @include s() {
      overflow: hidden;
    }
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
      color: #fff;
    }
  }

  .a {
    background: var(--bg1);
    width: 100%;
    max-width: 600px;
    height: 100%;
    display: flex;
    flex-direction: column;
    @include s() {
      width: 50%;
    }
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

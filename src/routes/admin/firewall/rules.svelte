<script>
  import Pg from "$lib/components/pg.svelte";
  import { confirm } from "$lib/store";
  import { req } from "$lib/req";
  import { method } from "$lib/enum";
  import { onMount } from "svelte";

  let total = 1;
  let p = 1;
  export let pop;
  let go = (n) => {
    p = n;
    req("rules", new Uint8Array([p, 20])).then(d => {
      ls = d.items;
      total = d.total;
    });
  };
  const add = () => {
    pop(2).then(d => {
      if (!d) return;
      req("rule", d).then(id => {
        d.id = id;
        ls = [d, ...ls];
      });
    });
  };

  const del = (id) => {
    confirm("sure to delete?").then(ok => {
      if (ok) {
        req("rules", id, { method: method.DELETE })
          .then(() => {
            ls = ls.filter(a => a.id !== id);
          });
      }
    });
  };

  const edit = (da) => {
    pop(1, da).then(d => {
      if (!d) return;
      d.id = da.id;
      req("rule", d).then(() => {
        const idx = ls.indexOf(da);
        if (idx > -1) {
          ls = [...ls];
          ls[idx] = d;
        }
      });
    });
  };

  let ls = [];

  onMount(() => {
    go(1);
  });

</script>
<div class="a">
  <div class="b">
    <div class="d">
      <h1>Rules</h1>
      <button on:click={add} class="icon i-add"></button>
    </div>
  </div>
  <div class="c">
    {#each ls as r}
      <div class="u" class:act={r.active}>
        <div class="i">
          {#if r.ip}
            <div class="icon i-ip"><span>{r.ip}</span></div>
          {/if}
          {#if r.path}
            <div class="icon i-target"><span>{r.path}</span></div>
          {/if}
          {#if r.country}
            <div class="icon i-geo"><span>{r.country}</span></div>
          {/if}
          {#if r.headers}
            <div class="icon i-set">
              <pre>{r.headers}</pre>
            </div>
          {/if}
        </div>
        <div class="r">
          {#if r.log}
            <span class="icon i-log"></span>
          {/if}
          {#if r.noAccess}
            <span class="icon i-fbi"></span>
          {/if}
          <span class="m">{r.mark || ''}</span>
          <button class="icon i-del" on:click={()=>del(r.id)}></button>
          <button class="icon i-ed" on:click={()=>edit(r)}></button>
        </div>
      </div>
    {/each}
  </div>
  <Pg {total} {go} />
</div>
<style lang="scss">
  @import "../../../lib/break";

  .i-set {
    background: rgba(0, 0, 0, .1);
  }

  .u {
    margin: 10px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--bg0);

    button {
      opacity: .5;

      &:hover {
        opacity: 1;
        color: #fff;
      }
    }
  }

  .act {
    background: #0f1c38;

    .m {
      color: #94abc0;
    }

    .i {
      span, div {
        color: #bfc6d9;
      }
    }

    .r {
      background: #070e1e;
    }
  }

  pre {
    flex: 1;
    font-size: 13px;
    padding: 0 10px;
  }

  .i {
    display: flex;
    flex-wrap: wrap;

    div {
      font-size: 14px;
      padding: 5px 10px;
      flex-grow: 1;
      width: 50%;

      span {
        color: #959ca8;
        padding-left: 10px;
      }
    }

    .i-set {
      line-height: 2;
      align-items: flex-start;
      display: flex;
      width: 100%;
    }
  }

  span.icon {
    margin-right: 10px;
    opacity: .7;
    min-width: 20px;
    padding: 0;
  }

  .i-log {
    color: #00d2ff;
  }

  .i-fbi {
    color: #f11b86;
  }

  .r {
    border-top: 1px solid rgba(0, 0, 0, 0.2);
    background: #1d2125;
    width: 100%;
    align-items: center;
    height: 30px;
    display: flex;
    padding: 0 10px;
  }


  .m {
    margin: 0 10px;
    font-size: 13px;
    flex: 1;
  }

  button {
    padding: 0 5px;
  }

  .d {
    display: flex;
    align-items: center;
    padding: 0 0 0 10px;
    height: 60px;

    button {
      padding: 10px 20px;

      &:hover {
        color: #fff;
      }
    }
  }

  h1 {
    flex: 1;
    padding: 0 10px;
    color: #627079;
    font-weight: 400;
    font-size: 14px;
  }

  .a {
    border-left: 1px solid #141e28;
    padding: 0 0 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    @include s() {
      width: 100%;
    }
  }

  .b {

  }

  .c {
    flex: 1;
  }
</style>
<script>
  import Ava from "$lib/components/post/ava.svelte";
  import { getErr } from "$lib/utils";
  import Ld from "$lib/components/loading.svelte";
  import { fade } from "svelte/transition";
  import { req } from "$lib/req";
  import { msg } from "./msg";

  export let admin = 0;
  export let slug;
  export let reply;
  export let done;
  export let edit;
  export let user = {};
  export let cur = {};
  let sh = 0;
  let cm = edit ? edit.content : "";
  let dis;
  let ed = 0;
  let ld = 0;
  $:{

    if (cur.name?.length > 10) cur.set({ name: cur.name.slice(0, 10) });
  }
  export let av = [];
  const limit = 512;

  function se() {
    ed = 1;
  }

  async function cmt() {
    ld = 1;
    const o = admin ? {
      isAdm: 1,
      content: cm
    } : {
      _slug: slug,
      _name: cur.name,
      _avatar: cur.avatar,
      content: cm
    };
    if (reply?.cm) o.reply = reply.cm;
    if (reply?.topic) o.topic = reply.topic;
    req("cm", o).then(a => {
      if (!admin) user.set(o._name, o._avatar);
      const v = { ...o, ...a, _own: 1 };
      if (o.reply) v._reply = reply.name;
      done && done(v);
      msg.set([1, "post success!"]);
      cm = "";
    }).catch(e => {
      msg.set([0, getErr(e)]);
    }).finally(() => {
      ld = 0;
    });
    // ld = 0;
  }

  function edi() {
    req("cm", { id: edit.id, content: cm }).then(a => {
      msg.set([1, "update success"]);
      edit.done({
        ...a,
        content: cm
      });
    });
  }

  $:{
    cm = (cm || "").replace(/\n+/g, "\n").slice(0, limit);
    dis = (!admin && !cur.name?.length) || !cm?.length;
  }
</script>
<div class="c" class:m={reply} class:ed={edit} class:am={admin}>
  {#if !reply && !edit && sh}
    <div class="as" transition:fade>
      {#each av as a}
        <Ava idx={a}
             size={40}
             cls={'av'+(a===cur.avatar?' act':'')}
             click={()=>{
                cur.avatar=a
                sh=0
            }}
        />
      {/each}
    </div>
  {/if}
  {#if !edit}
    <div class="o">
      <div class="nf">
        {#if !reply}
          <Ava idx={cur.avatar} size="34" click={()=>sh=1} />
          {#if ed}
            <input bind:value={cur.name} placeholder="name"
                   on:blur={()=>ed=0} />
          {:else }
            <span class="n">{cur.name}</span>
            <button class="icon i-refresh" on:click={cur.refresh}></button>
            <button class="icon i-ed" on:click={se}></button>
          {/if}
        {:else }
          <p>reply @{reply.name}</p>
        {/if}
        <div class="s"></div>
      </div>
      {#if !admin}
        <button class="icon i-pub"
                class:dis={dis}
                on:click={cmt}>
        </button>
      {/if}
    </div>
  {/if}
  <div class="sd">
    <div class="v">{cm}</div>
    <textarea placeholder="write something~" bind:value={cm}></textarea>
    <div class="ft">
      {#if edit}
        <div class="bn">
          <button class="icon i-ok" on:click={edi}></button>
          <button class="icon i-close" on:click={edit.close}></button>
        </div>
      {/if}
      <span class="t">{cm?.length || 0} / {limit}</span>
    </div>
  </div>
  {#if admin}
    <button class="pu"
            class:dis={dis}
            on:click={cmt}>
      reply
    </button>
  {/if}
  <Ld act={ld} text="submitting" />
</div>
<style lang="scss">
  :root {
    --bg: rgba(0, 0, 0, .15)
  }

  .ft {
    display: flex;
    justify-content: space-between;

    button {
      margin-right: 15px;
      padding: 0 3px;
    }
  }

  .t {
    position: absolute;
    right: 10px;
    bottom: 5px;
    font-size: 13px;
    color: #2e4a65;
  }

  .dis {
    cursor: not-allowed;
    opacity: .5;
  }

  input, .n {
    display: flex;
    align-items: center;
    height: 30px;
    font-weight: 200;
    min-width: 80px;
    font-size: 15px;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 130px;
    margin-left: 10px;
  }

  input {
    border: none;
    background: var(--bg1);
  }

  .sd {
    border-top: 1px solid #0d1926;
    padding-bottom: 1px;
  }

  .i-pub {
    background: #1a2641;
    color: #fff;
    font-size: 18px;
    width: 40px;
    height: 30px;
    border-radius: 4px;
  }

  .nf {
    display: flex;
    align-items: center;
    flex: 1;

    p {
      font-size: 13px;
      color: var(--darkgrey);
    }
  }

  .n {
    margin-right: 10px;
    width: auto;
  }

  .c {
    margin-top: 20px;
    border-radius: 4px;
    border: 1px solid var(--bg5);
    background: var(--bg);
  }

  .as {
    padding: 7px;
    position: absolute;
    height: 150px;
    top: -160px;
    width: 210px;
    overflow: hidden;
    background: var(--bg1);
    backdrop-filter: blur(6px);
    border: 1px solid #1d283a;
    box-shadow: rgba(0, 0, 0, .2) 0 3px 8px -3px;
    border-radius: 5px;
    display: flex;
    flex-wrap: wrap;

    :global {
      .av {
        background-position: center;
        background-repeat: no-repeat;
        background-size: auto 80%;
        margin: 3px;
        border-radius: 6px;

        &.act, &:hover {
          background-color: #070c17;
        }
      }
    }
  }

  .o {
    padding: 10px;
    display: flex;
    align-items: center;
  }

  .v {
    opacity: 0;
    pointer-events: none;
    min-height: 60px;
    overflow: hidden;
    max-height: 150px;
  }

  .v, textarea {
    padding: 10px 30px;
    white-space: pre-wrap;
    line-height: 1.5;
    font-size: 14px;
    margin-bottom: 20px;
  }

  textarea {
    border: none;
    width: 100%;
    resize: none;
    left: 0;
    right: 0;
    top: 5px;
    bottom: 10px;
    position: absolute;
    height: auto;
    color: #fff;
  }

  .m {
    margin: 0;
    height: auto;

    .i-pub {
      width: auto;
      color: #1c93ff;
      background: none;
      height: 20px;
      margin-top: 5px;
    }

    .o {
      padding: 5px 10px;
    }

    .sd {
      border: none;
    }

    .v, textarea {
      padding: 0 10px;
    }

    .t {
      right: 10px;
      bottom: 5px;
      font-size: 12px;
    }

    .v {
      min-height: 50px;
    }
  }

  .ed {
    background: rgba(100, 100, 100, .05);
    margin: 0;

    .v, textarea {
      padding: 10px;
    }

    .t {
      right: 5px;
      bottom: 3px;
    }
  }

  .am, .sd {
    display: flex;
    flex-direction: column;
  }

  .am {
    height: 300px;
    .sd {
      flex-grow: 1;
      max-height: 200px;

      .v, textarea {
        padding: 0 20px;
      }
    }

    .v {
      flex-grow: 1;
      max-height: none;
    }
  }

  .pu {
    transition: .2s;
    border-radius: 4px;
    position: relative;
    width: 90%;
    max-width: 300px;
    background: var(--blue);
    margin: 10px auto;
    height: 30px;
    color: #ddd;
  }
</style>
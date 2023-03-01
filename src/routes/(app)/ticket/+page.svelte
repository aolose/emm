<script>
  import Canvas from "$lib/components/ctx.svelte";
  import UpDownScroll from "$lib/components/upDownScroll.svelte";
  import Ph from "$lib/components/post/hd.svelte";
  import { tick } from "svelte";
  import { expand } from "$lib/store";
  import { req } from "$lib/req";
  import { getErr, watch } from "$lib/utils";

  let a;
  let sc;
  export let data;
  const { admin, read, post } = data.d;

  let inf = [
    [post, "show secret posts", 1],
    [read, "view admin page", 2],
    [admin, "all admin permissions", 2]
  ];

  async function scTop() {
    await tick();
    if (sc) {
      document.scrollingElement.scrollTop = 0;
      window.scrollTo(0, 0);
      sc.scrollTop = 0;
    }
  }

  let tm;
  let ld = 0;
  let code = "";
  let err = "";
  let e = 0;
  const we = watch(err);
  $:{
    we(() => {
      clearTimeout(tm);
      e = !!err;
      if (err) {
        tm = setTimeout(() => e = 0, 2e3);
      }
    }, err);
  }

  function check() {
    if (ld) return;
    err = "";
    ld = 1;
    if (!code) return;
    req("ticket", code).then(a => {
      debugger
      code = "";
    }).catch(e => {
      err = getErr(e);
    }).finally(() => {
      ld = 0;
    });
  }

</script>
<svelte:head>
  <title>Err - Posts</title>
</svelte:head>
<UpDownScroll bind:down={a} />
<svelte:window on:sveltekit:navigation-end={scTop} />
<Canvas type={1} />
<div class="o" class:e={$expand}>
  <Ph bind:shrink={a}>Ticket</Ph>
  <div>
    <div class="i">
      <div class="v">
        <input bind:value={code} placeholder="enter code" />
        <button on:click={check}>Check</button>
      </div>
      <span class="er" class:act={e}>{err}</span>
      <h1>status</h1>
      {#each inf as [act, t]}
        <div class="r" class:act>
          <div class="icon" class:i-ok={act}></div>
          <span>{t}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
<style lang="scss">
  @import "../../../lib/break.scss";

  .er {
    opacity: 0;
    background: rgba(190, 100, 150, .1);
    line-height: 2;
    padding: 5px 20px;
    border-radius: 4px;
    color: #c9a6a6;
    transition: .5s ease-in-out;

    &.act {
      opacity: 1;
    }
  }

  $r: 6px;
  .o {
    transition: .3s ease-in-out;

    &.e {
      padding-top: 30px;
    }
  }

  .i {
    padding: 20px;
    width: 90%;
    margin: 0 auto;
    @include s() {
      width: 100%;
    }
  }

  h1 {
    color: #ddd;
    font-size: 30px;
    line-height: 2;
    font-weight: 200;
  }

  input {
    flex-grow: 1;
    width: 0;
    height: 100%;
    text-align: center;
    font-size: 25px;
    letter-spacing: 3px;
    padding: 0 20px;
    border-radius: $r 0 0 $r;
  }

  .v {
    height: 60px;
    width: 400px;
    box-shadow: rgba(0, 0, 0, .1) 2px 10px -5px;
    margin: 20px 0;
    display: flex;
    align-items: center;

    button {
      text-transform: uppercase;
      font-size: 16px;
      color: #fff;
      background: var(--darkgrey-h);
      width: 120px;
      height: 100%;
      border-radius: 0 $r $r 0;
    }
  }

  .r {
    padding: 3px;
    display: flex;
    align-items: center;
    font-size: 20px;

    .icon {
      width: 20px;
      height: 20px;
      font-size: 18px;
      border: 1px solid;
      border-radius: 50%;
      margin-right: 10px;
    }

    * {
      color: var(--darkgrey-h);
    }

    &.act {
      .icon {
        color: green;
      }

      span {
        color: #2c7e38;
      }
    }
  }
</style>
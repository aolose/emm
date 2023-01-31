<script>
  import Select from "./select.svelte";
  import { permission, pmsName } from "$lib/enum";
  import { slide } from "svelte/transition";
  import Ld from "$lib/components/loading.svelte";

  let show = 0;
  let ok;
  let cancel;
  let t = 0;
  let d = {};
  let l = 0;

  function save(d) {

  }

  const pms = [
    [permission.Post, pmsName.Post],
    [permission.Read, pmsName.Read],
    [permission.Admin, pmsName.Admin]
  ];
  export const add = (type, data = {}) => {
    t = type;
    show = 1;
    d = { ...data };
    return new Promise((rs) => {
      ok = () => {
        save(d).then((id) => {
          show = 0;
          d.id = id;
          rs(d);
        });
      };
      cancel = () => {
        rs();
        show = 0;
      };
    });
  };
</script>

<div class="m">
  <div class="a">
    <div class="t">
      <span>{['token data',
        'ticket'][t]}</span>
      <button class="icon i-close"></button>
    </div>
    <div class="b">
      {#if !t}
        <div class="r"><span>name</span><input bind:value={d.name} /></div>
        <div class="r">
          <span>permission</span>
          <Select bind:value={d.permission} items={pms} />
        </div>
        {#if d.permission === permission.Post}
          <div class="r" transition:slide>
            <span>posts</span>
          </div>
        {/if}
      {:else }

      {/if}
    </div>
    <div class="n">
      <button>create</button>
      <button>cancel</button>
    </div>
    <Ld act={l} />
  </div>
</div>
<style lang="scss">
  .m {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    background: transparentize(#0d1017, .3);
  }

  .a {
    border: 1px solid rgba(34, 156, 249,.03);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    width: 400px;
    max-width: 100%;
    height: 500px;
    max-height: 100%;
    background: var(--bg1);
    box-shadow: var(--bg3) 0 20px 50px -30px;
  }

  .b {
    padding: 10px 0;
    flex: 1;
    background: var(--bg2);
  }

  .t {
    span {
      color: #5a6875;
    }

    button {
      opacity: .5;
      padding: 10px;
      right: -10px;
      transition: .2s;

      &:hover {
        opacity: 1;
      }
    }
  }

  .t, .n {
    padding: 0 20px;
    display: flex;
    height: 50px;
    align-items: center;
    justify-content: space-between;
  }

  .n {
    justify-content: center;
    height: 60px;

    button {
      color: var(--darkgrey-h);
      height: 30px;
      display: flex;
      margin: 0 10px;
      align-items: center;
      width: 100px;
      border-radius: 100px;
      justify-content: center;
      border: 1px solid currentColor;
      transition: .2s;

      &:hover {
        color: #566f85;
      }
    }
  }

  .r {
    display: flex;
    align-items: center;
    margin: 20px auto;
    width: 70%;

    span {
      color: #455564;
      width: 100px;
      text-align: right;
      padding-right: 20px;
    }

    input {
      width: 0;
      flex-grow: 1;
      border: 1px solid rgba(140, 181, 236, 0.1);
      background: var(--bg3);
    }
  }
</style>
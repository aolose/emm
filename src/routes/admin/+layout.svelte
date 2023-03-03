<script>
  import Menu from "./sideMenu.svelte";
  import Confirm from "$lib/components/confirm.svelte";
  import { onMount } from "svelte";
  import { allowCodeLogin, status } from "$lib/store";
  import { goto } from "$app/navigation";

  export let data;
  const { d } = data;
  onMount(() => {
    allowCodeLogin.set(d[1]);
    status.set(+d[0]);
    status.subscribe(s => {
      if (!s) goto("/login", { replaceState: true });
    });
  });

</script>

<div class="a">
  <div class="b">
    <Menu />
  </div>
  <div class="c">
    <slot />
  </div>
  <Confirm />
</div>

<style lang="scss">
  @import "../../lib/break";
  .a {
    height: 100%;
    width: 100%;
    display: flex;
  }

  .b,
  .c {
    height: 100%;
  }

  .b {
    flex-shrink: 0;
    z-index: 1;
    width: 72px;
  }

  .c {
    background: var(--bg1);
    flex: 1;
  }
  @include s(){
    .a{
      flex-direction: column;
    }
    .b{
      width: 100%;
      height: 48px;
    }
  }
</style>

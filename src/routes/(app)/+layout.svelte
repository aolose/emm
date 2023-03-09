<script>
  import Nav from "$lib/components/nav.svelte";
  import { expand } from "$lib/store";
  let b = "";
</script>
<div class="b" style={b}>
  <div class="nv ">
    <Nav />
  </div>
  <div class="g" class:ex={$expand}>
    <slot>
    </slot>
  </div>
</div>
<style lang="scss">
  @import "../../lib/break";

  :global {
    :root {
      --it: -160px;
      --skA: -15deg;
      --skB: 15deg;
      --poW: 15px;
      --poL: 108px;
      --poL2: 150px;
      --td: column;
      --tw: 80px;
      --pl: -10px;
      --itp: 10px;
      --mr: 30px;
      --ex: 80%;
      --artP: 60px;
      --artC: 20px 20px 60px;
      --fs: 28px;
      @include s() {
        --fs: 20px;
        --artC: 0 0 50px;
        --artP: 20px;
        --ex: 99%;
        --mr: 10px;
        --skA: 0deg;
        --skB: 0deg;
        --poL: 0;
        --poL2: 20px;
        --it: -5px;
        --itp: -20px;
        --td: row;
        --tw: auto;
        --pl: 0;
      }
    }

    * {
      color: #808fa9;
    }

    *::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: transparentize(#222f48, .4)
    }
  }

  .nv {
    right: 0;
    left: 0;
    top: 0;
    z-index: 99;
    position: fixed;
  }

  .b {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    transition: .3s ease-in-out;
    //background: url("../lib/bd/1.jpg") center no-repeat;
    background-size: cover;
  }

  .g {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    transition: .3s ease-in-out;

    &.ex {
      :global {
        .ctx {
          padding-top: 30px;
        }
      }
    }
  }
</style>
<script>
    import {fade} from "svelte/transition";
    import {onDestroy} from "svelte";
    export let tm=0
     export let act = 0
    let s = 0
    let v = 1
    const t = setInterval(function () {
        s = s + v
        if (s === 0 || s === 3) v = -v;
    }, 1e3)
    onDestroy(() => {
        return () => clearInterval(t)
    })
    export let text = "loading"
</script>
{#if act}
    <span
            transition:fade
            class="load" class:lt={tm}>
     <i></i>
    <span class="a">
        {text}
        <span class="b">{'.'.repeat(s)}</span>
    </span>
</span>
{/if}
<style lang="scss">
  @keyframes rd {
    0%, 100% {
      opacity: .8;
      transform-origin: 50% 50.5%;
    }
    50% {
      opacity: .5;
    }
    0% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  i {
    margin-bottom: 10px;
    width: 30px;
    height: 30px;
    background: url("./img/ld.svg") no-repeat center;
    background-size: 80% auto;
    animation: rd .8s linear infinite;
  }

  .load {
    flex-direction: column;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    background: transparentize(rgb(18,22,34), .2);
    backdrop-filter: blur(1px);
    border-radius: inherit;
    z-index: 100;
  }
  .lt{
    background: transparentize(rgb(250,250,250), .2);
    i{
      background-image: url("./img/ld1.svg");
    }
    span{
      color: #999;
    }
  }
  span{
    color: #2d9bc5;
  }
</style>
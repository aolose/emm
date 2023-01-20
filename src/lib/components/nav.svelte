<script>
    let a = 0
    import Link from './link.svelte'
</script>
<div class="e" on:click={()=>a=1-a} class:act={a}>
    <i class="e0"></i>
    <i class="e1"></i>
    <i class="e2"></i>
</div>
<nav class:act={a}>
    <div class="a">
        {#if a}
            <Link href="/"><span class="icon i-home"></span></Link>
            <Link href="/posts" exact={false}><span class="icon i-post"></Link>
            <Link href="/tags" exact={false}><span class="icon i-tags"></Link>
        {/if}
    </div>
</nav>
<style lang="scss">
  nav {
    border-right: 1px solid #27303d;
    display: flex;
    flex-direction: column;
    transition: .3s ease-in-out;
    opacity: 0;
    pointer-events: none;
    align-items: center;
    position: fixed;
    padding: 40px 15px;
    top: 0;
    left: 0;
    bottom: 0;

    span{
      color: inherit;
      font-size: 30px;
    }
  }
  .a{
    padding-top: 60px;
    padding-bottom: 90px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }
  .e {
    z-index: 5;
    cursor: pointer;
    position: fixed;
    left: 15px;
    top: 30px;
    transform: translate3d(0, -50%, 0);
    height: 36px;
    width: 36px;
    color: #6fa1da;

    i {
      transition: .3s ease-in-out;
      color: inherit;
      left: 9px;
      position: absolute;
      display: block;
      width: 50%;
      height: 1px;
      background: currentColor;
      transform: translate3d(0, 0, 0);
    }

    .e0 {
      top: 12px;
    }

    .e1 {
      top: 18px;
    }

    .e2 {
      top: 24px;
    }
  }

  nav.act {
    opacity: 1;
    pointer-events: auto;
  }

  .act.e {
    opacity: 1;
    .e0 {
      transform: translate3d(1px, 1px, 0) rotate(34deg) scaleX(.9);
    }

    .e1 {
      transform: translate3d(0, 0, 0) scale(0);
    }

    .e2 {
      transform: translate3d(1px, -1px, 0) rotate(-34deg) scaleX(.9);
    }
  }
</style>
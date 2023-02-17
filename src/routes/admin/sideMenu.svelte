<script lang="ts">
    import {act} from '$lib/use';
    import {req} from "$lib/req";
    import {method} from "$lib/enum";
    import {status} from "$lib/store";

    function logout(){
        req('logout',undefined,{method:method.GET}).then(()=>{
            status.set(0)
        })
    }
</script>

<div class="m">
    <a class="o" href="/"></a>
    <div class="u">
        <s></s>
        <a use:act href="/admin" class="icon i-post"></a>
        <a use:act href="/admin/comment" class="icon i-comment"></a>
        <a use:act href="/admin/tag" class="icon i-tag"></a>
        <a use:act href="/admin/firewall" class="icon i-safe"></a>
        <a use:act href="/admin/token" class="icon i-rq"></a>
        <a use:act href="/admin/setting" class="icon i-sys"></a>
        <s></s>
        <s></s>
    </div>
    <div class="v">
        <button
                on:click={logout}
                class="icon i-exit"></button>
    </div>
</div>

<style lang="scss">
  .v {
    height: 30px;
    width: 100%;
    padding-bottom: 70px;
    button{
      margin:  0 auto;
      transform: rotateY(180deg);
      &:hover {
        color: #fff;
        background: var(--blue);
        border-radius: 5px;
      }
    }
  }

  .u {
    justify-content: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    :global {
      .icon {
        &.act,
        &:hover {
          color: #fff;
          background: var(--blue);
          border-radius: 5px;
        }
      }
    }
  }

  s {
    flex: 1;
  }

  .icon {
    margin: 20px 0;
    color: #7c8ea2;
    font-weight: 200;
    display: block;
    text-align: center;
    width: 40px;
    line-height: 40px;
    font-size: 20px;
    cursor: pointer;
    transition: 0.3s;
  }

  .m {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
      background: var(--bg7);
  }

  .o {
    width: 24px;
    height: 24px;
    background: url("$lib/components/img/fav.png") center no-repeat;
    background-size: contain;
    margin: 36px auto 0;
  }

  i {
    display: block;
  }
</style>

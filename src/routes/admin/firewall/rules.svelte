<script>
    import Pg from '$lib/components/pg.svelte'

    let total = 1
    let go = () => {
    }
    const d = [
        {
            ip: '10.0.0.1',
            mark: '',
            path: '',
            country: '',
            header: '',
            active: 0,
            log: 1,
            noAccess: 1,
        },
        {
            ip: '10.0.0.1',
            mark: 'whatever',
            path: '/path',
            country: '',
            header: '',
            active: 1,
            log: 1,
            noAccess: 1,
        },
        {
            ip: '10.0.0.1',
            mark: '',
            path: '/admin/posts',
            country: 'spider',
            header: 'type:ccc\nxxx:yyy',
            active: 0,
            log: 0,
            noAccess: 0,
        },
    ]

</script>
<div class="a">
    <div class="b">
        <div class="d">
            <h1>Rules</h1>
            <button class="icon i-add"></button>
        </div>
    </div>
    <div class="c">
        {#each d as r}
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
                    {#if r.header}
                        <div class="icon i-comment"><pre>{r.header}</pre></div>
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
                    <button class="icon i-del"></button>
                    <button class="icon i-ed"></button>
                </div>
            </div>
        {/each}
    </div>
    <Pg {total} {go}/>
</div>
<style lang="scss">
  .u {
    margin: 10px;
    overflow: hidden;
    border-radius: 2px;
    background: #2a3344;

    button {
      opacity: .5;

      &:hover {
        opacity: 1;
        color: #fff;
      }
    }
  }

  .act {
    background: #324264;

    .m {
      color: #94abc0;
    }

    .i {
      span, div {
        color: #bfc6d9;
      }
    }

    .r {
      background: #162736;
    }
  }

  pre {
    flex: 1;
    font-size: 13px;
    padding:  0 10px;
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
    .i-comment{
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
    background: #282d38;
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
    button{
      padding:  10px 20px;
      &:hover{
        color: #fff;
      }
    }
  }

  h1 {
    flex: 1;
    padding: 0 10px;
    color: #39667e;
    font-weight: 400;
    font-size: 14px;
  }

  .a {
    border-left: 1px solid #141e28;
    padding: 0 0 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .b {

  }

  .c {
    flex: 1;
  }
</style>
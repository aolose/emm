<script>
    import {onMount} from "svelte";
    import {req} from "$lib/req";
    import Itm from './item.svelte'
    import Pg from '$lib/components/pg.svelte'
    import Ck from '$lib/components/check.svelte'
    import Ld from '$lib/components/loading.svelte'
    import HdsIpt from './headers.svelte'

    let sel = new Set()
    let tab = 0
    let ls = []
    let lastL = 0
    let loop = 1
    const size = 30
    let p = 1
    let total
    let ld = false
    $:total = Math.floor((ls.length + size - 1) / size)
    $:lss = ls.slice(size * (p - 1), size * p)

    function fx() {
        const l = []
        const s = new Set()
        ls.forEach(a => {
            if (a && a.length) {
                const k = a[0] + a[1]
                if (s.has(k)) return
                s.add(k)
                l.push(a)
            }
        })
        l.sort((a, b) => b[0] - a [0])
        lastL = (l[0] || [0])[0]
        ls = l
    }

    function loadLog() {
        ld = true
        req('log', lastL).then(r => {
            ls.push(...r)
            fx()
        }).finally(() => ld = false)
    }

    onMount(() => {
        let t = setInterval(() => {
            if (loop) loadLog()
        }, 3e3)
        loadLog()
        return () => clearInterval(t)
    })

    function ck(k) {
        return () => {
            if(sel.has(k))sel.delete(k)
            else sel.add(k)
            sel=new Set(sel)
        }
    }
</script>
<div class="a">
    <div class="c">
        <div class="d">
            <div class="h">
                <h1>Logs</h1>
                <s></s>
                <div class="tb" class:ac={tab}>
                    <span on:click={()=>tab=0}>real-time</span>
                    <span on:click={()=>tab=1}>firewall</span>
                    <i></i>
                </div>
                <button on:click={loadLog} class="icon i-refresh"></button>
                <Ck name="auto refresh" bind:value={loop}/>
            </div>
        </div>
        <div class="e">
            <div class="b">
                {#each lss as d (d[0] + d[1])}
                    <Itm ck={ck} data={d} sel={sel} isDb={tab}/>
                {/each}
            </div>
            <Pg total={total} page={p} go={n=>p=n}/>
        </div>
        <Ld act={ld}/>
    </div>
    <div class="f">
        <button class="clo">
            <i></i>
            <i></i>
        </button>
        <div class="f0">
            <label>
                <span>IP:</span>
                <input/>
            </label>
            <label>
                <span>path:</span>
                <input/>
            </label>
            <label>
                <span>country:</span>
                <input/>
            </label>
            <label>
                <span>mark:</span>
                <input/>
            </label>
            <label>
                <span>header:</span>
                <HdsIpt/>
            </label>
        </div>
        <div class="fn">
            <button>create rule</button>
            <button>search</button>
        </div>
    </div>
</div>
<style lang="scss">
  .clo {
    position: absolute;
    transition: .2s ease-in-out;
    left: 10px;
    top: 10px;
    width: 50px;
    height: 50px;
    color: #3a537c;

    &:hover {
      color: #00d2ff;

      i {
        transform: rotate(35deg);
        transform-origin: right;
        width: 20px;
        margin-left: 20px;

        & + i {
          transform: rotate(-35deg);
        }
      }
    }

    i {
      transition: inherit;
      transform: rotate(45deg);
      position: absolute;
      top: 0;
      left: 0;
      margin: 24px 10px;
      background: currentColor;
      width: 30px;
      height: 1px;

      & + i {
        transform: rotate(-45deg);
      }
    }
  }

  .f0 {
    flex: 1;
  }

  .fn {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;

    button {
      border-radius: 20px;
      cursor: pointer;
      color: #354e65;
      border: 1px solid currentColor;
      margin: 0 20px;
      padding: 5px 20px;
      transition: .3s ease-in-out;

      &:hover {
        background: #1c93ff;
        color: #fff;
        border-color: transparent;
      }
    }
  }

  .f {
    width: 600px;
    height: 100%;
    padding: 70px 20px 0;
    display: flex;
    flex-direction: column;
  }

  .g {
    display: flex;
  }

  .tb {
    margin-right: 10px;
    display: flex;
    height: 20px;
    align-items: center;
    border-radius: 100px;
    background: var(--bg0);

    i {
      border-radius: inherit;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 50%;
      transition: .1s ease-in-out;
      background: var(--darkgrey);
    }

    span {
      cursor: pointer;
      transition: .1s ease-in-out;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      line-height: 1;
      color: #8aa4af;
      z-index: 3;

      & + span {
        color: #858fa1;
        margin-left: -10px;
      }
    }
  }

  .ac {
    i {
      transform: translateX(100%);
    }

    span {
      color: #858fa1;

      & + span {
        color: #8aa4af;
      }
    }
  }

  h1 {
    font-weight: 400;
    font-size: 18px;
    padding: 0 10px;
    color: #6d7f94;
  }

  .h {
    height: 60px;
    align-items: center;
    background: #242b38;
    display: flex;
    width: 100%;
    padding: 0 10px;

    s {
      flex: 1;
    }
  }

  label {
    width: 100%;
    font-size: 15px;
    align-items: flex-start;

    input {
      width: 0;
      resize: none;
      border: 1px solid #304565;
      background: var(--bg1);
      flex: 1;
      box-shadow: inset var(--bg0) 0 0 5px;
    }

    span {
      line-height: 32px;
      color: #8092a9;
      text-align: right;
      padding-right: 10px;
      width: 80px;
    }

    display: flex;
    padding: 10px;
  }

  .d {
    border-bottom: 1px solid #1e222c;
    flex-wrap: wrap;
    display: flex;
    background: var(--bg2);
  }

  .e {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg2);
    padding-bottom: 20px;
  }

  button {
    margin-right: 20px;
  }

  .a {
    width: 100%;
    height: 100%;
    display: flex;
  }


  .c {
    display: flex;
    flex-direction: column;
    height: 100%;
    //width: 600px;
    width: 100%;
  }

  .b {
    flex: 1;
    height: 100%;
    overflow: auto;
  }

</style>
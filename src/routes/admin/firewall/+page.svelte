<script>
    import {onMount} from "svelte";
    import {req} from "$lib/req";
    import {time} from "$lib/utils";
    import {fade} from "svelte/transition";
    import Pg from '$lib/components/pg.svelte'
    import Ck from '$lib/components/check.svelte'
    import Ld from '$lib/components/loading.svelte'

    let sel = null
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

    function col(n, s) {
        if (n < 300) return 0 === s
        if (n >= 500) return 3 === s
        if (n >= 400) return 2 === s
        return 1 === s
    }

    function ck(k) {
        return () => sel = sel === k ? '' : k
    }
</script>
<div class="a">
    <div class="c">
        <div class="d">
            <div class="h">
                <h1>Logs</h1>
                <s></s>
                <div class="tb">
                    <span></span>
                </div>
                <button on:click={loadLog} class="icon i-refresh"></button>
                <Ck name="auto refresh" bind:value={loop}/>
            </div>
            <label>
                <span>IP:</span>
                <input/>
            </label>
            <label>
                <span>path:</span>
                <input/>
            </label>
            <label>
                <span>ua:</span>
                <input/>
            </label>
            <label>
                <span>country:</span>
                <input/>
            </label>
            {#if tab}
                <label>
                    <span>header:</span>
                    <input/>
                </label>
                <label>
                    <span>mark:</span>
                    <input/>
                </label>
            {/if}
        </div>
        <div class="e">
            <div class="b">
                {#each lss as [tm, ip, ph, ua, st, ct, mk] (tm + ip)}
                    <div class="r" class:act={sel === tm+ip} transition:fade on:click={ck(tm+ip)}>
                        <div class="r0"><span>{time(tm)}</span></div>
                        <div class="r1"><span>{ip}</span></div>
                        <div class="r3"><span
                                class:c0={col(st,0)}
                                class:c1={col(st,1)}
                                class:c2={col(st,2)}
                                class:c3={col(st,3)}
                        >{st}</span></div>
                        <div class="r2"><span>{ph}</span></div>
                        <div class="r6"><span>{ct}</span></div>
                        <div class="r4"><span>{mk}</span></div>
                        <div class="r5"><span>{ua}</span></div>
                    </div>
                {/each}
            </div>
            <Pg total={total} page={p} go={n=>p=n}/>
            <Ld act={ld}/>
        </div>
    </div>
</div>
<style lang="scss">
  h1{
    font-weight: 400;
    font-size: 18px;
    padding:  0 10px;
    color: #6d7f94;
  }
  .h {
    height: 60px;
    align-items: center;
    background: #242b38;
    display: flex;
    width: 100%;
    padding: 0 10px;
    margin-bottom: 5px;

    s {
      flex: 1;
    }
  }

  label {
    font-size: 15px;

    input {
      border: 1px solid #304565;
      background: var(--bg1);
      flex: 1;
      box-shadow: inset var(--bg0) 0 0 5px;
    }

    span {
      color: #8092a9;
      text-align: right;
      padding-right: 10px;
      width: 80px;
    }


    display: flex;
    align-items: center;
    padding: 10px;
  }

  .d {
    padding-bottom: 5px;
    flex-wrap: wrap;
    display: flex;
    background: var(--bg2);
    margin-bottom: 10px;
  }

  .e {
    background: var(--bg2);
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 10px;
  }

  button {
    margin-right: 20px;
  }

  .a {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .r {
    transition: .3s ease-in-out;
    background: #1e2633;
    flex-wrap: wrap;
    display: flex;
    font-size: 13px;

    span {
      transition: .3s ease-in-out;
      color: #72849b;
    }

    div {
      flex-grow: 1;
      transition: .3s ease-in-out;
      padding: 5px 10px;
      white-space: normal;
      word-break: break-all;
      height: 100%;
      min-height: 30px;
      align-self: center;
      border-bottom: 1px solid rgba(255,255,255,.05);
    }

    &:not(.act):hover {
      background: #233146;

      .r5 {
        span {
          color: #95a3c9;
        }
      }
    }
  }

  .c {
    display: flex;
    flex-direction: column;
    height: 100%;
    //width: 600px;
    width: 100%;
    max-width: 1000px;
  }

  .b {
    margin-bottom: 10px;
    flex: 1;
    height: 100%;
    overflow: auto;
  }

  .r0 {
    text-align: center;
    width: 100px;
    span {
      font-size: 12px;
      color: #717d8c;
    }
  }

  .r1 {
    width: 120px;
  }

  .r2 {
    width: 120px;

    span {
      color: #72849b;
    }
  }

  .r3 {
    width: 80px;
  }

  .r4 {
    flex: 1;
  }

  .r6 {
    width: 50px;
  }

  .r5 {
    background: #191d28;
    width: 100%;

    span {
      color: #3e505d;
    }
  }

  .r {
    .c0 {
      color: #13ad13
    }

    .c1 {
      color: #b6a963
    }

    .c2 {
      color: #e06914
    }

    .c3 {
      color: #d33232
    }
  }

  .act {
    z-index: 90;
    box-shadow: #14171a 0 2px 5px;
    background: #294272;

    span {
      color: #a8bfe5;
    }

    .r5 {
      background: #487ec2;

      span {
        color: #d4e3f5;
      }
    }
  }
</style>
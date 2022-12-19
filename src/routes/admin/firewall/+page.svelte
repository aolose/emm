<script>
    import {onMount} from "svelte";
    import {req} from "$lib/req";
    import {time} from "$lib/utils";
    import {fade} from "svelte/transition";
    import Pg from '$lib/components/pg.svelte'
    import Ck from '$lib/components/check.svelte'
    import Ld from '$lib/components/loading.svelte'

    let ls = []
    let lastL = 0
    let loop = 0
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
</script>
<div class="a">
    <div class="c">
        <div class="d">
            <button on:click={loadLog} class="icon i-refresh"></button>
            <Ck name="auto refresh" bind:value={loop}/>
        </div>
       <div class="e">
           <div class="b">
               {#each lss as [tm, ip, ph, ua, st, ct, mk] (tm + ip)}
                   <div class="r" transition:fade>
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
                       <div class="r0"><span>{time(tm)}</span></div>
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
  .d {
    display: flex;
    padding: 0 10px;
  }
  .e{
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    background: #222e3a;
    flex-wrap: wrap;
    display: flex;
    font-size: 13px;

    span {
      color: #72849b;
    }

    div {
      padding: 5px 10px;
      white-space: normal;
      word-break: break-all;
      height: 100%;
      align-self: center;
    }
  }
  .c {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 600px;
    background: var(--bg2);
    padding: 10px 0;
  }

  .b {
    flex: 1;
    height: 100%;
    margin: 10px;
    overflow: auto;
  }

  .r0 {
    width: 140px;

    span {
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
</style>
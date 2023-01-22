<script>
    import {browser} from "$app/env";
    import {randNm, rndAr, time} from "$lib/utils";
    import {fade, fly, slide} from "svelte/transition";
    import Ld from '$lib/loading.svelte'
    import Ava from '$lib/components/post/ava.svelte'
    import Pag from '$lib/components/pg.svelte'
    import {req} from "$lib/req";
    import {method} from "$lib/enum";

    export let id = ''
    export let act = 0
    let msg = []
    let ls = [], ed = 0, ld = 0, total
    let sh = 0
    const avLs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    let nm = '', av = 0, cm = ''
    let dis = 0
    $:{
        dis = !nm.length || !cm.length
        if (browser) {
            localStorage.av = av = +av || +localStorage.av || (rndAr(avLs) + 1)
            nm = nm || localStorage.nm || randNm()
            av = +av || +localStorage.av || 1
        }
        if (!/^[0-9a-z· \u4e00-\u9fa5]+$/.test(nm)) nm = nm.replace(/[^0-9a-z· \u4e00-\u9fa5]/g, '')
        if (nm.length > 16) nm = nm.substr(0, 16)
        if (cm.length > 512) nm = nm.substr(0, 512)
    }
    let cur = 1
    let lsLd = 0

    async function go(p) {
        const i = p || 1
        lsLd = 1
        const re = await req('comments', [id, i],{method:method.GET})
        const {items: ss, r} = re
        ls = ss || []
        if (ls.length) {
            if (r) {
                r.forEach(a => {
                    ls.forEach(c => {
                        if (c.i === a.t) {
                            c.r = (c.r || []).concat(a)
                        }
                    })
                })
            }
            cur = re.cur
            total = re.total
            setTimeout(() => {
                if (el && p) el.scrollIntoView(true)
            }, 300)
        }
        lsLd = 0
    }

    let t, el

    async function cmt() {
        ld = 1
        nm = nm.replace(/^\s+|\s+$/g, '')
        cm = cm.replace(/^\s+|\s+$/g, '')

        const re = await req('comment',[av,id,nm,cm])

        if (/^\d+$/g.test(`${re}`)) {
            const i = +re
            msg = [1, "post success!"]
            ls = [
                {
                    i,
                    a: av,
                    n: nm,
                    d: id,
                    r: 0,
                    c: cm,
                    t: Math.floor(Date.now() / 1e3),
                    o: 1
                }
            ].concat(ls)
            cm = ''
        } else {
            msg = [0, re.error]
        }
        clearTimeout(t)
        t = setTimeout(() => msg = [], 3e3)
        ld = 0
    }

    function se() {
        ed = 1
    }

    function rn() {
        nm = randNm()
        av = localStorage.av = rndAr(avLs) + 1
    }

    function del(id) {
        tip("Delete the comment?", function () {
            query('delCm', id).then(() => {
                ls = ls.filter(({i}) => i !== id)
            })
        }, 1)
    }

    if (browser) {
        go()
    }
</script>
<div class:sh={act} class="cm">
    <div class="c">
        {#if msg.length === 2}
            <div class="tp"
                 class:su={msg[0]}
                 class:fa={!msg[0]}
                 transition:fly={{ y: 50, duration: 500 }}>
                {msg[1]}
            </div>
        {/if}
        {#if sh}
            <div class="as" transition:fade>
                {#each avLs as a}
                    <Ava idx={a+1}
                         cls={'av'+(a===av-1?' act':'')}
                         click={()=>{
                av=a+1
                sh=0
            }}
                    />
                {/each}
            </div>
        {/if}
        <div class="o" bind:this={el}>
            <Ava idx={av} click={()=>sh=1}/>
            {#if ed}
                <input bind:value={nm} placeholder="name"
                       on:blur={()=>ed=0}/>
            {:else }
                <span class="n">{nm}</span>
                <i class="r" on:click={rn}></i>
                <i class="e" on:click={se}></i>
            {/if}
            <div class="s"></div>
            <div class="bn"
                 class:dis={dis}
                 on:click={cmt}>Commit
            </div>
        </div>
        <div class="sd">
            <div class="v">{cm}</div>
            <textarea placeholder="write something~" bind:value={cm}></textarea>
        </div>
        <Ld tm={1} act={ld} text="committing"/>
    </div>
    <div class="ls">
        {#each ls as {i, r, a, n, t, o, c} (i)}
            <div class="m" class:s={o} transition:slide|local>
                {#if (o)}
                    <i on:click={()=>del(i)} class="del"></i>
                {/if}
                <div class="h">
                    <Ava idx={a}/>
                    <label>{n}</label>
                </div>
                <div class="cx">
                    <p>{c}</p>
                    <span>{time(t)}</span>
                </div>
            </div>
            {#each (r || []) as {z, c, i: v}(v)}
                <div class="rp">
                    <label>admin </label>
                    <span>{time(z)}</span>
                    <p>{c}</p>
                </div>
            {/each}
        {/each}
        <Ld act={lsLd} tm={1}/>
    </div>
    {#if total > 1}
        <Pag cur={cur} total={total} url={go} tm="1"/>
    {/if}
</div>
<PopMsg light="1"/>
<style lang="scss">
  .m {
    padding: 5px 0 20px;
    display: flex;

    &:nth-child(2n) {
      label {
        color: #9b9675;
      }

      p {
        color: #666;
      }

      .cx {
        border-color: #efece8;
        background: #fafafa;
      }
    }
  }

  .h {
    padding-right: 10px;
    width: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  label {
    text-align: center;
    color: #7e9b9f;
    white-space: nowrap;
    word-break: break-word;
    font-size: 12px;
  }

  .cx {
    flex: 1;
    padding: 5px 10px 20px;
    border-radius: 3px;
    border: 1px solid #dfe7e8;

    p {
      margin-right: 20px;
      color: #999;
      font-size: 13px;
    }

    span {
      color: #000;
      opacity: .5;
      line-height: 1;
      position: absolute;
      right: 3px;
      bottom: 3px;
      font-size: 11px;
    }
  }

  .tp {
    text-align: center;
    min-width: 200px;
    max-width: 90%;
    background: #fdfdfd;
    position: absolute;
    z-index: 99;
    border-radius: 6px;
    box-shadow: rgba(0, 0, 0, .25) 0 3px 10px -4px;
    padding: 10px;
    bottom: 110%;
    min-height: 30px;
    transform: translateX(-50%);
    left: 50%;
    color: #fff;
    backdrop-filter: blur(2px);
  }

  .su {
    background-color: transparentize(#16b005, .3)
  }

  .fa {
    background-color: transparentize(#ff6200, .3)
  }

  .as {
    padding: 7px;
    position: absolute;
    height: 150px;
    top: -160px;
    width: 200px;
    background: transparentize(#16204d, .9);
    backdrop-filter: blur(6px);
    border: 1px solid #eee;
    box-shadow: rgba(0, 0, 0, .2) 0 3px 8px -3px;
    border-radius: 5px;
    display: flex;
    flex-wrap: wrap;

    :global {
      .av {
        width: 40px;
        height: 40px;
        background-position: center;
        background-repeat: no-repeat;
        background-size: auto 80%;
        margin: 3px;
        border-radius: 6px;

        &.act, &:hover {
          background-color: #fff;
        }
      }
    }
  }

  .rp {
    overflow: hidden;
    position: relative;
    padding: 0 10px 5px;
    border-radius: 3px;
    border: 1px solid #dfe7e8;
    margin: -10px 0 20px 80px;

    label {
      color: #9facbd;
      text-align: left;
      bottom: -2px;
      left: 0;
      right: 0;
      background: rgba(67, 117, 217, 0.04);
      padding: 1px 10px 3px;
      position: absolute;
    }

    p {
      color: #8496ad;
      font-size: 12px;
      margin-top: 5px;
      margin-bottom: 20px;
    }

    span {
      font-size: 11px;
      color: #a1a4a6;
      bottom: 1px;
      right: 5px;
      position: absolute;
    }
  }

  .s {
    flex: 1
  }

  .bn {
    opacity: .7;
    cursor: pointer;
    border-radius: 2px;
    padding: 5px 10px;
    color: #fff;
    background: #1cbbff;
    transition: .1s ease-in-out;

    &:hover {
      opacity: 1
    }
  }

  .cm {
    margin-top: 20px;
  }

  .c {
    margin-bottom: 20px;
    border: 1px solid #eee;
    border-radius: 4px;
    background: transparentize(#eee, .6);
  }

  input, .n {
    display: flex;
    align-items: center;
    height: 30px;
    font-weight: 600;
    color: #f59528;
    min-width: 80px;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .n {
    margin-right: 10px;
    width: auto;
  }

  .r, .e {
    opacity: .5;
    height: 20px;
    width: 20px;
    cursor: pointer;
    background: url("./img/c.svg") center no-repeat;
    background-size: 60%;

    &:hover {
      opacity: 1;
    }
  }

  .e {
    background-image: url("./img/e.svg");
  }

  .o {
    border-radius: 2px;
    padding: 5px 10px;
    background: #fff;
    display: flex;
    align-items: center;
  }

  .sd {

  }

  .v {
    opacity: 0;
    pointer-events: none;
    min-height: 60px;
    overflow: hidden;
    padding: 20px 10px;
    max-height: 150px;
  }

  .v, textarea {
    white-space: pre-wrap;
    line-height: 1.5;
    font-size: 14px;
  }

  textarea {
    width: 100%;
    resize: none;
    left: 0;
    padding: 0 10px;
    right: 0;
    top: 5px;
    bottom: 10px;
    position: absolute;
    height: auto;
  }

  .del {
    z-index: 5;
    position: absolute;
    width: 20px;
    height: 20px;
    transition: all .2s ease-in-out;
    background: url("./img/del1.svg") center no-repeat;
    background-size: contain;
    top: 8px;
    right: 5px;
    opacity: .3;
    cursor: pointer;

    &:hover {
      opacity: .8;
    }
  }

  .dis {
    pointer-events: none;
    background: #aaa;
  }
</style>

<script>
    import Ava from "$lib/components/post/ava.svelte";
    import {onMount} from "svelte";
    import {getErr, randNm, rndAr} from "$lib/utils";
    import Ld from "$lib/components/loading.svelte";
    import {fly, fade} from "svelte/transition";
    import {req} from "$lib/req";

    export let slug
    export let reply
    export let done
    export let user = {}
    let sh = 0;
    let av = 0;
    let cm;
    let nm;
    let dis;
    let ed = 0;
    let ld = 0;
    let msg = [];
    const limit = 512
    const avLs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    function rn() {
        nm = randNm();
        av = localStorage.av = rndAr(avLs);
    }

    function se() {
        ed = 1;
    }

    async function cmt() {
        ld = 1;
        const o = {
            _slug: slug,
            _name: nm,
            _avatar: av,
            content: cm,
            reply
        }
        req('cm', o).then(a => {
            user.name = o._name
            user.avatar = o._avatar
            done && done({...o, ...a})
        }).catch(e => {
            msg = [0, getErr(e)]
        }).finally(() => {
            ld = 0
        })
        // ld = 0;
    }

    onMount(() => {
        localStorage.av = av = +av || +localStorage.av || (rndAr(avLs));
        nm = nm || localStorage.nm || randNm();
        av = +av || +localStorage.av || 1;
    });
    $:{
        cm = (cm || '').replace(/\n+/g, '\n').slice(0, 512)
        dis = !nm?.length || !cm?.length;
    }
</script>
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
                <Ava idx={a}
                     size={40}
                     cls={'av'+(a===av?' act':'')}
                     click={()=>{
                av=a
                sh=0
            }}
                />
            {/each}
        </div>
    {/if}
    <div class="o">
        <div class="nf">
            <Ava idx={av} size="34" click={()=>sh=1}/>
            {#if ed}
                <input bind:value={nm} placeholder="name"
                       on:blur={()=>ed=0}/>
            {:else }
                <span class="n">{nm}</span>
                <button class="icon i-refresh" on:click={rn}></button>
                <button class="icon i-ed" on:click={se}></button>
            {/if}
            <div class="s"></div>
        </div>
        <button class="icon i-pub"
                class:dis={dis}
                on:click={cmt}>
        </button>
    </div>
    <div class="sd">
        <div class="v">{cm}</div>
        <textarea placeholder="write something~" bind:value={cm}></textarea>
        <span class="t">{cm?.length || 0} / {limit}</span>
    </div>
    <Ld act={ld} text="submitting"/>
</div>
<style lang="scss">
  .t {
    position: absolute;
    right: 15px;
    bottom: 10px;
    font-size: 13px;
    color: #2e4a65;
  }

  .dis {
    cursor: not-allowed;
    opacity: .5;
  }

  input, .n {
    display: flex;
    align-items: center;
    height: 30px;
    font-weight: 200;
    min-width: 80px;
    font-size: 15px;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 130px;
    margin-left: 10px;
  }

  input {
    border: none;
    background: var(--bg1);
  }

  .sd {
    border-top: 1px solid #0d1926;
    padding-bottom: 1px;
  }

  .i-pub {
    background: #1a2641;
    color: #fff;
    font-size: 18px;
    width: 40px;
    height: 30px;
    border-radius: 4px;
  }

  .nf {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .n {
    margin-right: 10px;
    width: auto;
  }

  .c {
    margin-top: 20px;
    border-radius: 4px;
    border: 1px solid var(--bg5);
    background: var(--bg2);
  }

  .tp {
    text-align: center;
    min-width: 200px;
    max-width: 90%;
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
    background-color: transparentize(#ff0044, .8)
  }

  .as {
    padding: 7px;
    position: absolute;
    height: 150px;
    top: -160px;
    width: 210px;
    overflow: hidden;
    background: var(--bg1);
    backdrop-filter: blur(6px);
    border: 1px solid #1d283a;
    box-shadow: rgba(0, 0, 0, .2) 0 3px 8px -3px;
    border-radius: 5px;
    display: flex;
    flex-wrap: wrap;

    :global {
      .av {
        background-position: center;
        background-repeat: no-repeat;
        background-size: auto 80%;
        margin: 3px;
        border-radius: 6px;

        &.act, &:hover {
          background-color: #070c17;
        }
      }
    }
  }

  .o {
    padding: 10px;
    display: flex;
    align-items: center;
  }

  .v {
    opacity: 0;
    pointer-events: none;
    min-height: 60px;
    overflow: hidden;
    max-height: 150px;
  }

  .v, textarea {
    padding: 10px 30px;
    white-space: pre-wrap;
    line-height: 1.5;
    font-size: 14px;
    margin-bottom: 20px;
  }

  textarea {
    border: none;
    width: 100%;
    resize: none;
    left: 0;
    right: 0;
    top: 5px;
    bottom: 10px;
    position: absolute;
    height: auto;
  }
</style>
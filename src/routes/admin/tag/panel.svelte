<script>
    import {selectFile} from "$lib/store";
    import {fade} from "svelte/transition";

    let ok
    let cancel
    let show = false
    export const setTag = a => {
        d = {...a}
        show = !!a
        return new Promise(r => {
            ok = () => {
                r(d)
            }
            cancel = () => r()
        }).finally(() => {
            show = false
        })
    }
    let d = {}

    function sel() {
        selectFile(1, 'image/*').then(a => {
            const id = a?.[0]?.id
            if(id)d.banner=''+id
        })
    }

</script>
{#if show}
    <div class="b" transition:fade>
        <div class="t">
            <button class="icon i-close" on:click={cancel}></button>
            <button class="s" on:click={ok}>save</button>
        </div>
        <div class="c">
            <div class="r">
                <span>name</span>
                <p>{d.name}</p>
            </div>
            <div class="r">
                <span>desc</span>
                <div class="x">
                    <p>{d.desc || ''}</p>
                    <textarea bind:value={d.desc}></textarea>
                </div>
            </div>
            <div class="r">
                <span>banner</span>
                <div class="p icon"
                     on:click={sel}
                     class:i-pic={!d.banner}
                     style:background-image={d.banner?`url(/res/_${d.banner})`:''}>
                    {#if d.banner}
                        <button
                                on:click|stopPropagation={()=>d.banner=null}
                                class="icon i-close"></button>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}
<style lang="scss">
  .b {
    flex: 1;
    max-width: 600px;
    height: 100%;
    background: var(--bg2);
  }

  input, .x {
    flex-grow: 1;
  }

  .x {
    border: 1px solid rgba(119, 129, 138, 0.3);
    max-height: 400px;

    p, textarea {
      padding: 0 10px;
      border: none;
      min-height: 34px;
      white-space: pre-wrap;
      word-break: break-all;
      width: 100%;
      font-size: 13px;
      line-height: 34px;
    }

    textarea {
      resize: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    p {
      padding-top: 34px;
      opacity: 0;
      pointer-events: none;
    }
  }

  .c {
    padding-top: 40px;
  }

  .p {
    flex: 1;
    height: 200px;
    border: 1px solid rgba(119, 129, 138, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    color: transparentize(#fff, .8);
    cursor: pointer;
    transition: .2s;
    background: center no-repeat;
    background-size: contain;
    &:hover{
      color: #6c7a93;
    }
    button {
      color: #6c7a93;
      position: absolute;
      top: 0;
      right: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: #ffffff;
      }
    }
    .i-close{
      text-shadow: #000 1px 1px;
    }
  }

  .t {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 75px;
    padding: 0 20px;
    border-bottom: 1px solid var(--bg1);
    .i-close {
      color: #485c6c;
      font-size: 20px;
      &:hover{
        color: #7987a2;
      }
    }
  }

  .s {
    cursor: pointer;
    border-radius: 100px;
    font-size: 16px;
    color: #485c6c;
    padding: 5px 20px;
    border: 1px solid currentColor;
    transition: .2s;
    &:hover{
      color: #7a91bb;
    }
  }

  .r {
    span {
      line-height: 30px;
      width: 100px;
    }

    display: flex;
    flex-wrap: wrap;
    padding: 10px 50px;
  }
</style>
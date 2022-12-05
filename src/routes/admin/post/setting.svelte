<script>
    import CheckBox from '$lib/components/check.svelte'
    import Tags from '$lib/components/tags.svelte'
    import {onMount} from "svelte";
    import {editPost, selectFile, setting, tags, tokens} from "$lib/store";
    import {fade} from "svelte/transition";

    let tg = []
    let tk = []
    let post = {}
    const pickPic = () => {
        setting.set(0)
        selectFile(1).then(a => {
            console.log(a)
            post = {...post, banner: a[0].id}
        }).finally(() => setting.set(1))
    }
    const rmPic = () => {
        delete post.banner
        post = {...post}
    }
    const ok = () => {
        setting.set(0)
        editPost.update(p => ({...p, ...post}))
    }
    const cancel = () => {
        setting.set(0)
    }

    onMount(() => {
        const f0 = editPost.subscribe(p => post = {...p})
        const f1 = tags.subscribe(t => tg = t.map(a => a.name))
        const f2 = tokens.subscribe(t => tk = t.map(a => a.name))
        return () => {
            f0()
            f1()
            f2()
        }
    })

</script>
{#if $setting}
    <div class="m" transition:fade>
        <div class="a">
            <div class="h">
                <button class="icon i-ok" on:click={ok}>
                    <span>save</span>
                </button>
                <span>Setting</span>
                <button class="icon i-close" on:click={cancel}>
                    <span>cancel</span>
                </button>
            </div>
            <div class="f">
                <div class="r">
                    <h3>Slug</h3>
                    <input/>
                </div>
                <div class="r">
                    <h3>Description</h3>
                    <textarea></textarea>
                </div>
                <div class="r">
                    <h3>Banner</h3>
                    <div
                            class:act={post.banner}
                            style:background-image={post.banner?`url(/res/_${post.banner})`:''}
                            class="p icon i-pic"
                            on:click={pickPic}>
                        {#if post.banner}
                            <button
                                    on:click|stopPropagation={rmPic}
                                    class="icon i-close" transition:fade></button>
                        {/if}
                    </div>
                </div>
                <div class="r">
                    <h3>Tags</h3>
                    <div class="t">
                        <Tags tags={tg}/>
                    </div>
                </div>
                <div class="r">
                    <h3>Tokens</h3>
                    <div class="t">
                        <Tags tags={tg}/>
                    </div>
                </div>
                <div class="r">
                    <CheckBox name="allow comment"/>
                    <CheckBox name="need approval"/>
                </div>
            </div>
        </div>

    </div>
{/if}
<style lang="scss">
  .m {
    z-index: 5;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(18, 22, 28, 0.76);
    backdrop-filter: blur(1px);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .f {
    flex: 1;
    overflow: auto;
    overflow-x: hidden;
    padding-bottom: 30px;

    &::-webkit-scrollbar-track {
      background: var(--bg2);
    }

    &::-webkit-scrollbar-thumb {
      background: #232d3a;
    }
  }

  .a {
    display: flex;
    flex-direction: column;
    max-height: 90%;
    background: var(--bg2);
    width: 400px;
    box-shadow: rgba(0, 0, 0, .2) 0px 3px 10px;
  }

  .h {
    span {
      color: #6c7a93;
    }

    padding: 20px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--bg0);
  }

  button {
    background: none;
    color: #3a596b;
    font-size: 20px;
    display: flex;
    line-height: 1;
    border: none;
    cursor: pointer;
    transition: .3s ease-in-out;
    width: 80px;

    span {
      font-size: 18px;
      position: relative;
      display: block;
      color: inherit !important;
    }

    &:hover {
      color: #fff;
    }
  }

  .i-close {
    justify-content: flex-end;
  }

  .r {
    padding: 20px;
  }

  h3 {
    color: #545e72;
    font-weight: 200;
    font-size: 13px;
    line-height: 2;
  }

  input, textarea, .p, .t {
    display: block;
    margin-top: 20px;
    border: none;
    background: var(--bg1) center no-repeat;
    width: 100%;
    outline: none;
    padding: 10px;
    box-shadow: inset 0 0 3px rgba(0, 0, 0, .2);
    border-radius: 3px;
    resize: none;
  }

  .p {
    position: relative;
    cursor: pointer;
    height: 200px;
    color: var(--darkgrey);
    font-size: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;

    button {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      text-shadow: #fff 0 0 2px;
      font-weight: 600;
      width: 40px;
      height: 40px;

      &:hover {
        text-shadow: #000 0 0 2px;
      }
    }
  }

  .act {
    color: transparent;
  }
</style>
<script>
    import {onMount} from "svelte";
    import Editor from '$lib/components/editor.svelte'
    import {editPost, originPost} from "$lib/store";
    import {api} from "$lib/req";
    import {diffObj} from "$lib/utils";
    import {get} from "svelte/store";
    import {browser} from "$app/environment";
    import {fade} from "svelte/transition";

    let title = ''
    let draft = ''
    $:{
        if (browser) editPost.update(p => {
            if (!p._) return p
            const np = {
                ...p, content_d: draft, title_d: title
            }
            autoSave(np)
            return np
        })
    }

    const savePost = api('post', {delay: 5e3})

    const autoSave = async (p) => {
        const ori = get(originPost)
        const o = diffObj(ori, p)
        if (!o) return
        const _ = p._
        const v = {...o, _}
        if (p.id) {
            v.id = p.id
            delete v._
        }
        const r = await savePost(v) || {}
        originPost.update(u => {
            if (_ === u._) {
                return {...u, ...o, ...r}
            }
        })
        editPost.update(u => {
            if (_ === u._) {
                return {...u, ...r}
            }
        })
        // todo sync to post List
    }


    onMount(async () => {
        return editPost.subscribe(p => {
            draft = p.content_d || p.content || '';
            title = p.title_d || p.title || '';
        })
    })
</script>
{#if $editPost._}
    <div class="a" transition:fade>
        <div class="t">
            <input bind:value={title}/>
            <button class="icon i-publish"></button>
        </div>
        <div class="e">
            <Editor bind:value={draft}/>
        </div>
    </div>
{/if}

<style lang="scss">
  .a {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .e {
    flex: 1;
    position: relative;
  }

  .t {
    display: flex;
    align-items: center;
    align-content: normal;
    padding: 0 8%;

    button {
      font-size: 30px;
    }
  }

  button {
    border: none;
    width: 40px;
    height: 40px;
    color: var(--darkgrey);
    background: none;
    margin-left: 5px;
    cursor: pointer;

    &:hover {
      color: #999;
    }
  }

  input {
    font-size: 40px;
    flex: 1;
    margin: 20px 20px 10px 0;
    padding: 0 10px;
    border: 0;
    resize: none;
    color: #556175;
    outline: none;
  }
</style>

<script>
    import {onMount} from "svelte";
    import Editor from '$lib/components/editor.svelte'
    import {confirm, editPost, originPost, posts, saveNow, setting} from "$lib/store";
    import {api, req} from "$lib/req";
    import {diffObj} from "$lib/utils";
    import {get} from "svelte/store";
    import {browser} from "$app/environment";
    import {fade} from "svelte/transition";
    import {method} from "$lib/enum";

    let title = ''
    let draft = ''
    let cid = 0
    const tSet = {
        name: "setting",
        action: () => {
            setting.set(1)
        },
        className: "icon i-sys",
        title: "setting",
    }
    const tPub = {
        name: "publish",
        action: () => {
            confirm('sure to publish?', 'publish').then(() => {
                saveNow.set(1)
                autoSave(get(editPost), 1)
            })
        },
        className: "icon i-pub",
        title: "publish",
    }
    const tUnPub = {
        name: "UnPublish",
        action: () => {
            saveNow.set(1)
            editPost.update(p => ({...p, published: 0}))
        },
        className: "icon i-draft",
        title: "unPublish",
    }
    const tDiscard = {
        name: "Discard",
        action: () => {
            editPost.update(p => {
                const {title, content} = p
                return {...p, title_d: title, content_d: content}
            })
        },
        className: "icon i-drop",
        title: "discard",
    }
    const tDel = {
        name: "delete",
        action: () => {
            confirm('sure to delete?').then(() => {
                req('post', new Uint8Array([cid]), {method: method.DELETE}).then(a => {
                    if (a) {
                        posts.update(u => {
                            return u.filter(u => u.id !== cid)
                        })
                        originPost.set({})
                        editPost.set({})
                    }
                })
            })
        },
        className: "icon i-del",
        title: "delete",
    }
    let tools = []
    $:{
        if (browser) editPost.update(p => {
            return {
                ...p, content_d: draft, title_d: title
            }
        })
    }

    const delaySave = api('post', {delay: 3e3})
    const save = api('post')
    let saving = 0
    const id = a => a.id || a._
    const autoSave = async (p, isPublish) => {
        if (saving) return
        const now = get(saveNow)
        if (now) saving = 1
        saveNow.set(0)
        const ori = get(originPost)
        const o = diffObj(ori, p)
        if (!isPublish && (!o || !Object.values({...o, id: ''}).join(''))) return saving = 0
        const _ = p._
        const v = {...o, _}
        if (p.id) {
            v.id = p.id
            delete v._
        }
        const k = id(p)
        if (isPublish) v._p = isPublish
        const r = await (now ? save : delaySave)(v) || {}
        originPost.update(u => {
            if (k === id(u)) {
                return {...u, ...o, ...r}
            }
            return u
        })
        editPost.update(u => {
            if (k === id(u)) {
                return {...u, ...o, ...r}
            }
            return u
        })
        saving = 0
    }


    onMount(async () => {
        return editPost.subscribe(p => {
            draft = p.content_d || '';
            title = p.title_d || '';
            const {id, save, published, modify, title: _title, content} = p
            cid = id
            const up = modify || 0
            const hasDraft = save > up
            const t = []
            t.push(tSet)
            if ((_title || content) && (title !== _title || draft !== content)) t.push(tDiscard)
            if (published) t.push(tUnPub)
            if (hasDraft) t.push(tPub)
            if (id) t.push(tDel)
            if (tools.join() !== t.join()) {
                tools = t
            }
            autoSave(p)
        })
    })
</script>
{#if $editPost._ || $editPost.id}
    <div class="a" transition:fade>
        <div class="t">
            <input bind:value={title}/>
        </div>
        <div class="e">
            <Editor bind:value={draft} toolbar={tools}/>
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

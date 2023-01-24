<script>
    import Search from './search.svelte';
    import AddPost from './add.svelte';
    import Pg from '$lib/components/pg.svelte';
    import Editor from './editor.svelte';
    import PItem from './pItem.svelte'
    import Setting from './setting.svelte'
    import FileWin from '$lib/components/fileManager.svelte';
    import Viewer from '$lib/components/viewer.svelte'
    import {editPost, originPost, posts} from "$lib/store";
    import {api} from "$lib/req";
    import {onMount} from "svelte";

    const getPost = api('posts')
    let pages = 1
    let tmpMark = 1

    function sel(p) {
        const o = {...p}
        if (!o.id) {
            o._ = tmpMark++
        }
        if (!o.title_d) o.title_d = o.title
        if (!o.content_d) o.content_d = o.content
        originPost.set({...o})
        editPost.set({...o})
    }

    function page(n = 1) {
        getPost({page:n,size:10}).then(p => {
            const {total, items = []} = p
            if (items) posts.set(items)
            pages = total
        })
    }

    onMount(() => {
        page()
    })
</script>

<div class="x">
    <div class="m">
        <div class="a">
            <div class="h">
                <Search/>
                <AddPost/>
            </div>
            <div class="ls">
                {#each $posts as p (p._ || p.id)}
                    <PItem p={p} sel={sel}/>
                {/each}
            </div>
            <div class="p">
                <Pg go={page} total={pages}/>
            </div>
        </div>
        <div class="b">
            <Editor/>
        </div>
        <div class="c">
            <Viewer preview={true}/>
        </div>
        <FileWin/>
        <Setting/>
    </div>
</div>

<style lang="scss">


  .x {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .m {
    display: flex;
    height: 100%;
  }

  .a {
    width: 40%;
    max-width: 400px;
    background: var(--bg1);
    display: flex;
    flex-direction: column;
  }

  .b {
    width: 50%;
    max-width: 1000px;
    background: var(--bg2);
  }

  .ls {
    direction: rtl;
    flex: 1;
    overflow: auto;
    overflow-x: hidden;
    width: 100%;

    &::-webkit-scrollbar-track {
      -webkit-box-shadow: inset var(--bg1) 0 0 10px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(49, 62, 87, 0.75);
    }
  }

  .p {
    padding-top: 10px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .c {
    width: 800px;
  }
</style>

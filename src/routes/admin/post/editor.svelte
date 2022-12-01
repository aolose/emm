<script>
    import {onMount} from "svelte";
    import Editor from '$lib/components/editor.svelte'
    import {editPost} from "$lib/store";

    let title = ''
    let draft = ''
    $:{
        editPost.update(p => {
            return {
                ...p, _content: draft, _title: title
            }
        })
    }
    onMount(async () => {
        return editPost.subscribe(p => {
            draft = p._content || p.content || '';
            title = p._title || p.title || '';
        })
    })
</script>
<div class="a">
    <div class="t">
        <input bind:value={title}/>
        <button class="icon i-publish"></button>
    </div>
    <div class="e">
        <Editor bind:value={draft}/>
    </div>
</div>

<style lang="scss">
  .a {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .d {
    display: none
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

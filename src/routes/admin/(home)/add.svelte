<script>
  import { editPost, originPost } from "$lib/store";
  import { randNum, trim } from "$lib/utils";

  export let done;
  export let a = "";
  $: {
    a =trim(a);
  }

  function add() {
    if (a) {
      const _ = randNum();
      const o = {
        _,
        title_d: a,
        content_d: ""
      };
      originPost.set({ _ });
      editPost.set({ ...o });
      a = "";
      done && done();
    }
  }
</script>

<div class="a">
  <input placeholder="write a new story..." bind:value={a} />
  <button class="icon i-add" class:act={a} on:click={add}></button>
</div>

<style lang="scss">
  @import "../../../lib/break";

  .a {
    width: 300px;
    display: flex;
    margin: 20px auto;
    @include s(){
      width: 80%;
    }
  }

  input {
    height: 40px;
    flex: 1;
    border: none;
    background: rgba(0, 0, 0, 0.2);
    outline: none;
  }

  button {
    opacity: 0.9;
    transition: 0.2s;
    margin-left: 4px;
    border-radius: 4px;
    height: 40px;
    width: 40px;
    background: var(--darkgrey);
    color: #fff;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }

  .act {
    background: var(--blue);
  }
</style>

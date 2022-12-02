<script>
    import Date from './timLabel.svelte'

    export let sel = () => 0
    export let p = {}

    $:isPublish = p.published
    $:title = isPublish ? p.title : p.title_d || p.title || ''
    $:desc = (isPublish ? p.content : p.content_d || p.content || '').substring(0,128)

    import {editPost} from "$lib/store";
</script>

<div class="pi" on:click={() => sel(p)} class:act={$editPost.id === p.id}>
    <div class="v">
        {#if !isPublish || p.save > p.update}<span class="vd" title="draft">D</span>{/if}
        {#if isPublish}<span class="vp" title="published">P</span>{/if}
    </div>
    <h3>{title}</h3>
    <p>{desc}</p>
    <div>
        <Date name="create" value={p.createAt}/>
        <Date name="update" value={p.modify}/>
        <Date name="publish" value={p.publish}/>
        <Date name="save" value={p.save}/>
    </div>
</div>

<style lang="scss">
  .v {
    position: absolute;
    right: 10%;
    top: 20px;
    display: flex;
    line-height: 1;

    span {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      width: 14px;
      height: 14px;
      margin-right: 5px;
      font-weight: 800;
      padding: 0 !important;
      opacity: 0.5;
      border: 1px solid currentColor;
    }
  }

  .vd {
    color: var(--blue);
  }

  .vp {
    color: var(--green-h);
  }

  .pi {
    position: relative;
    direction: ltr;

    &:not(.act):hover {
      background: var(--bg0);
    }

    &.act {
      background: var(--bg2);
    }

    transition: 0.3s ease-in-out;

    h3 {
      padding-right: 80px;
      line-height: 3;
      font-weight: 200;
    }

    padding: 10px 10%;

    p {
      opacity: 0.5;
      font-size: 12px;
    }

    div {
      padding: 10px 0;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      line-height: 1.5;

      span {
        padding-left: 5px;
      }
    }
  }
</style>
<script>
    import FileIcon from './fileIcon.svelte'
    import {getExt} from "$lib/utils";

    export let file = {
        id: 0,
        name: '',
        thumb: '',
        type: ''
    };
    let pic = ''
    if (file.type.startsWith('image/')) {
        pic = `/res/_${file.id}`
    }
</script>

<div class="a">
    <div class="p" style:background-image={pic?`url(${pic})`:''}>
        {#if !pic}
            <div class="f">
                <FileIcon size={60} type={getExt(file)}/>
            </div>
        {/if}
    </div>
    <div class="n" title={file.name}>{file.name}</div>
</div>

<style lang="scss">
  .f {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .a {
    width: 100px;
    margin: 5px;
    background: var(--bg0);
    border-radius: 5px;
  }

  .p {
    position: relative;
    padding-top: 100%;
    background: var(--bg2);
    background-size: cover;
    border-radius: 4px;
  }

  .n {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 2;
    text-align: center;
  }
</style>

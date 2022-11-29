<script>
    import FileIcon from './fileIcon.svelte'
    import {getExt} from "$lib/utils";
    import {onMount} from "svelte";

    let m = null
    let left = 0
    let top = 0
    let sh = 0
    let flag=0
    const timers = []
    const clear = () => timers.forEach(clearTimeout)
    const changePosition = () => {
        const d = 50 * [].filter.call(
            m.parentElement.children,
            a => !a.className.includes('act')
        ).indexOf(m)
        timers.push(setTimeout(() => {
            const {offsetLeft, offsetTop} = m
            left = offsetLeft
            sh = 1
            timers.push(setTimeout(() => top = offsetTop, 100))
        }, d))
    }
    onMount(() => {
        file.render=changePosition
        flag = 1
        changePosition()
        return clear
    })
    $:{
        if (flag) changePosition()
    }
    export let file = {
        id: 0,
        name: '',
        type: '',
        size: 0
    };
    export let act = false
    let pic = ''
    if (file.type.startsWith('image/')) {
        pic = `/res/_${file.id}`
    }
</script>

<div class="m" bind:this={m}></div>
<div class="a m"
     style:transform={`translate3d(${left}px,${top}px,0)`}
     class:act on:click class:sh>
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

  .m {
    pointer-events: none;
    width: 100px;
    height: 124px;
    margin: 5px;
  }

  .a {
    pointer-events: all;
    opacity: 0;
    left: 0;
    top: 0;
    position: absolute;
    transition: .3s linear;
    cursor: pointer;
    background: var(--bg0);
    border: 1px solid transparent;
    &:hover {
      border-color: var(--darkgrey);
    }

    &.act {
      border-color: #5679a8;
      box-shadow: rgba(0,0,0,.2) 1px 2px 4px;
    }
  }

  .sh {
    opacity: 1;
  }


  .p {
    border-radius: inherit;
    position: relative;
    padding-top: 100%;
    background: var(--bg2);
    background-size: cover;
  }

  .n {
    width: 90%;
    margin: 0 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 2;
    text-align: center;
  }
</style>

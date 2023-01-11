<script>
    import P from './panel.svelte'
    import T from './item.svelte'
    import FileWin from '$lib/components/fileManager.svelte'
    import {req} from "$lib/req";
    import {onMount} from "svelte";
    import {method} from "$lib/enum";

    let ls = []
    let name = ''
    let ok = false
    let sel = {}
    function allTags() {
        req('tagLS').then(d => {
            ls = d
        })
    }

    function add(){

    }

    function ss(n){
        return (e)=>{
            let t
            e.stopPropagation()
            if(sel===n)sel={}
            else t=sel=n
            setTag(t)
        }
    }

    onMount(() => {
        allTags()
    })
    $:{
        name = name.replace(/[;, \t\s]/g, '')
        ok = name && !ls.find(a => a.name === name)
    }
    let setTag;
    function del(name){
       req('tag',name,{method:method.DELETE}).then(()=>{
           ls=ls.filter(a=>a.name!==name)
       })
    }
</script>
<div class="c">
    <div class="a">
        <div class="r h" class:o={ok}>
            <span>Tags</span>
            <s></s>
            <input placeholder="Enter tag name" bind:value={name}/>
            <button class="icon i-add" on:click={add}></button>
        </div>
        <div class="ls">
            {#each ls as i}
                <T d={i} ck={ss(i)} sel={sel===i} del={del}/>
            {/each}
        </div>
    </div>
    <P bind:setTag={setTag}/>
</div>
<FileWin/>


<style lang="scss">
  .c{
    width: 100%;
    height: 100%;
    display: flex;
  }
  s{
    flex: 1;
  }
  .h{
    padding: 20px 30px;
    border-bottom: 1px solid #343c4d;
    align-items: center;
    justify-content: center;
    input{
      background: var(--bg0);
      margin-right: 10px;
    }
    button{
      border-radius: 4px;
      height: 34px;
      width: 34px;
      background: #6c7a93;
    }
  }
  .o{
    button{
      background: #1c93ff;
    }
  }
  .a {
    background: var(--bg2);
    width: 100%;
    max-width: 600px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .ls{
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    overflow: auto;
    padding: 20px;
    align-content: flex-start;
  }
  .r {
    display: flex;
  }
</style>

<script>
    import {confirm} from "$lib/store";

    export let d = {}
    export let sel = false
    export let  ck
    export let del
    function de(name){
        return ()=>confirm('sure to delete the tag?').then(a=>{
            if(a)del(name)
        })
    }
</script>
<div class="a" class:s={sel} on:click={ck}>
    {#if d.banner}
        <div class="b" style:background-image={`url(/res/_${d.banner})`}></div>
    {/if}
    <div class="t">
        <h4>{d.name}</h4>
        <button on:click={de(d.name)} class="icon i-del"></button>
    </div>
    {#if d.desc}<p>{d.desc}</p>{/if}
</div>

<style lang="scss">
  .t{
    display: flex;
  }
  button{
    cursor: pointer;
    opacity: .5;
    width: 40px;
    align-items: center;
    display: flex;
    justify-content: center;
    &:hover{
      opacity: 1;
    }
  }
  h4{
   flex: 1;
  }
 .a{
   &:hover{
      border-color: #28649a;
   }
   cursor: pointer;
   transition: .2s ease-in-out;
   border: 1px solid transparent;
   width: 46%;
   min-width: 200px;
   min-height: 100px;
   margin: 10px;
   background: var(--bg1);
   padding-bottom: 20px;
 }
 .s{
   background: var(--bg0);
   border-color: rgb(39, 64, 85);
 }
 h4{
   padding:  10px 20px;
 }
 p{
   padding:  10px 20px;
   white-space: normal;
   word-break: break-all;
 }
</style>
<script>
    export let d = {}
    export let sel = false
    export let  ck
</script>
<div class="a" class:s={sel} on:click={ck}>
    {#if d.banner}
        <div class="b" style:background-image={`url(/res/_${d.banner})`}></div>
    {/if}
    <h4>{d.name}</h4>
    {#if d.desc}<p>{d.desc}</p>{/if}
</div>

<style lang="scss">
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
<script>
  import { elmCpm, elmProps, elmTmpl } from "$lib/components/customent/reg.ts";
  import { onMount } from "svelte";

  let z
  const o = {};
  $:{
    for (const [k, v] of Object.entries(o)) {
      elmTmpl.update(a =>({...a,[k]:v}));
    }
  }
  onMount(()=>{
    const obs = new MutationObserver(()=>{
      elmTmpl.update(a=>({...a}))
    })

    obs.observe(z,{
      childList:true,
      subtree:true,
      attributes:true
    })
  })

</script>
<div bind:this={z}>
  {#each Object.entries($elmProps) as [k, p]}
    <div bind:this={o[k]}>
      <svelte:component this={elmCpm[k.replace(/@.*/,'')]} {...p} />
    </div>
  {/each}
</div>
<style>
  div{
      display: none;
  }
</style>

<script>
  import Ph from "$lib/components/post/hd.svelte";
  import Canvas from "$lib/components/ctx.svelte";
  import UpDownScroll from "$lib/components/upDownScroll.svelte";
  import { expand, h } from "$lib/store";
  import { fade } from "svelte/transition";
  import Head from "$lib/components/Head.svelte";
	import Viewer from "$lib/components/about.svelte";

  let a = 0;
  export let data;
  const {d} = data
</script>

<Head title={`${$h.title} - about`} />
<UpDownScroll bind:down={a} />
<Canvas type={3} />
<div class="o" class:e={$expand} transition:fade>
  <Ph bind:shrink={a}>About</Ph>
  <div class="v" class:s={a}>
		<div class="ct">
			<Viewer value={d}/>
		</div>
  </div>
</div>

<style lang="scss">
  @import '../../../lib/break';
 .ct{
   width: 90%;
   max-width: 600px;
 }
  .o {
    transition: 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .e {
    transform: translate3d(0, 30px, 0);
  }

  .v {
    padding: 10px 5% 100px;
    overflow: auto;
    border-radius: 1rem;
  }
</style>

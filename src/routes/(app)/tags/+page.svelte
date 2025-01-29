<script lang="ts">
	import Ph from '$lib/components/post/hd.svelte';
	import Canvas from '$lib/components/ctx.svelte';
	import { bubbles, getColor } from '$lib/utils';
	import UpDownScroll from '$lib/components/upDownScroll.svelte';
	import { expand, h } from '$lib/store';
	import { fade } from 'svelte/transition';
	import Head from '$lib/components/Head.svelte';

	let a = $state(0);
	let { data } = $props();
	const d = data.d.split(',').filter((a) => a);
</script>

<Head title={`${$h.title} - tags`} />
<UpDownScroll bind:down={a} />
<Canvas type={2} />
<div class="o" class:e={$expand} transition:fade|global>
	<Ph bind:shrink={a}>Tags</Ph>
	<div class="v" class:s={a}>
		<div class="ls">
			{#each d as tag, i}
				<a
					onmouseenter={(e) => bubbles(e.target)}
					href={`/tag/${tag}`}
					style={`background:${getColor(i)}`}
				>
					<span>{tag} </span></a
				>
			{/each}
			{#if !d.length}
				<p>No tags found.</p>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
  @use '../../../lib/break' as *;

  .o {
    transition: 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .e {
    transform: translate3d(0, 30px, 0);
  }

  .cc {
    padding: 60px 0 20px;
    position: relative;
    border-bottom: 1px solid #eee;
    box-shadow: rgba(0, 0, 0, 0.05) 0 10px 10px -5px;
  }

  a {
    display: block;
    min-width: 100px;
    text-align: center;
    font-size: 14px;
    margin: 10px 15px;
    border-radius: 3px;
    position: relative;

    span {
      display: block;
      color: #fff;
      border-radius: inherit;
      padding: 7px 10px;
      transition: 0.2s ease-in-out;
    }

    &:hover {
      span {
        background: rgba(0, 0, 0, 0.5);
      }
    }
  }

  .v {
    position: absolute;
    top: 30px;
    bottom: 100px;
    left: 50%;
    width: 100%;
    transform: translate3d(-50%, 0, 0);
    overflow: auto;
    padding: 100px 5% 0;
    transition: 0.3s ease-in-out;
    clip-path: inset(80px 0px 10px 0 round 8px);
  }

  .ls {
    flex: 1;
    max-width: 800px;
    align-content: flex-start;
    display: flex;
    flex-wrap: wrap;
  }

  .s {
    @include s() {
      clip-path: inset(10px 0px 10px 0 round 8px);
    }
  }
</style>

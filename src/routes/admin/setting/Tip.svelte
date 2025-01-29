<script lang="ts">
	import { fly } from 'svelte/transition';

	let { err, act, text } = $props();
</script>

{#if act}
	<div class="a" class:e={err} class:b={act} transition:fly|global={{ y: -50, duration: 500 }}>
		{text}
	</div>
{/if}

<style lang="scss">
  @use 'sass:color';

  .a {
    z-index: 10;
    text-align: center;
    min-width: 50%;
    position: absolute;
    top: 50px;
    right: 50%;
    transform: translateX(50%);
    background: color.adjust(green, $alpha: -0.7);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;

    backdrop-filter: blur(3px);
    box-shadow: rgba(0, 0, 0, 0.3) 0 3px 10px -3px;
    padding: 5px 10px;
    color: #ddd;
    border-radius: 4px;
  }

  .e {
    background: color.adjust(orange, $alpha: -0.8);
  }

  .b {
    opacity: 1;
  }
</style>

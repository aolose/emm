<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onDestroy } from 'svelte';

	let s = $state(0);
	let v = 1;
	const t = setInterval(function() {
		s = s + v;
		if (s === 0 || s === 3) v = -v;
	}, 1e3);
	onDestroy(() => {
		return () => clearInterval(t);
	});

	interface Props {
		act?: number;
		text?: string;
	}

	let { act = 0, text = 'loading' }: Props = $props();
</script>

{#if act}
	<span transition:fade|global class="load">
		<i></i>
		<span class="a">
			{text}
			<span class="b">{'.'.repeat(s)}</span>
		</span>
	</span>
{/if}

<style lang="scss">
  @use 'sass:color';

  @keyframes rd {
    0%,
    100% {
      opacity: 0.8;
      transform-origin: 50% 50.5%;
    }
    50% {
      opacity: 0.5;
    }
    0% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  i {
    margin-bottom: 10px;
    width: 30px;
    height: 30px;
    background: url('./img/ld.svg') no-repeat center;
    background-size: 60% auto;
    animation: rd 0.8s linear infinite;
  }

  .load {
    flex-direction: column;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    background: color.adjust(rgb(17, 21, 30), $alpha: -0.2);
    backdrop-filter: blur(1px);
    border-radius: inherit;
    z-index: 100;
  }

  span {
    color: #4c6996;
  }
</style>

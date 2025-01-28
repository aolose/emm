<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { small } from '$lib/store';
	import { delay } from '$lib/utils';

	export let style = '';
	let h = 99999;
	let a = 0;
	let btn;
	let t;
	let p;
	const setA = delay((n) => {
		a = n;
	}, 60);
	onMount(() => {
		return small.subscribe(() => {
			if (btn) {
				let top = 0;
				const sc = () => {
					let n = 0;
					const o = p.scrollTop;
					if (Math.abs(o - top) < 50) return;
					if (o > top) n = 0;
					else if (o > h / 5) n = 1;
					top = o;
					setA(n);
				};
				p = btn.parentElement;
				p.addEventListener('scroll', sc);
				return () => p.removeEventListener('scroll', sc);
			}
		});
	});
</script>

<svelte:window bind:innerHeight={h} />
<div bind:this={btn} class="o" {style}>
	{#if a}
		<button
			on:click={() => p.scrollTo(0, 0)}
			transition:fly|global={{ y: 50, duration: 500 }}
			class="t icon i-up"
			class:a
		/>
	{/if}
</div>

<style lang="scss">
  @use '../break' as *;

  .o {
    position: fixed;
    bottom: 40px;
    right: 30px;
    z-index: 3;

    @include s() {
      right: 20px;
    }
  }

  .t {
    transition: 0.2s ease-in-out;
    border-radius: 50%;
    line-height: 1;
    font-size: 20px;
    color: #fff;
    height: 40px;
    width: 40px;
    border: 1px solid rgba(180, 200, 225, 0.3);
    background: rgba(60, 140, 245, 0.8);
    background-clip: content-box;
    box-shadow: rgba(0, 0, 0, 0.2) 0 2px 5px -2px;
    display: block;
    opacity: 0;
    pointer-events: none;

    &:hover {
      opacity: 1;
      border-color: rgba(80, 130, 250, 0.8);
      background: rgba(60, 140, 245, 0.4);
    }

    &.a {
      opacity: 0.8;
      pointer-events: auto;
    }
  }
</style>

<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { small } from '$lib/store';
	import { delay } from '$lib/utils';
	let { style = '' } = $props();
	let h = $state(99999);
	let a = $state(0);
	let btn = $state();
	let t;
	let p = $state();
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
			onclick={() => p.scrollTo(0, 0)}
			transition:fly|global={{ y: 50, duration: 500 }}
			class="t icon i-up"
			class:a
		></button>
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
		line-height: 40px;
		font-size: 20px;
		color: #fff;
		height: 40px;
		width: 40px;
		border: none;
		background: linear-gradient(130deg, rgba(44, 68, 101, 0.8), rgba(44, 17, 76, 0.8));
		box-shadow: rgba(23, 8, 8, 0.2) 0 2px 5px -2px;
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

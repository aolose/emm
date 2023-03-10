<script>
	import { watch } from '$lib/utils';
	import { onMount } from 'svelte';

	onMount(() => {});
	let h = 99999;
	let a = 0;
	let b = 0;
	let btn;
	const wa = watch(a);
	const wb = watch(b);
	let t;
	onMount(() => {
		if (btn) {
			let top = 0;
			const sc = () => {
				const o = p.scrollTop;
				if (o < top && o > h / 3) a = 1;
				else b = 0;
				top = o;
			};
			const p = btn.parentElement;
			btn.onclick = () => p.scrollTo(0, 0);
			p.addEventListener('scroll', sc);
			return () => p.removeEventListener('scroll', sc);
		}
	});
	$: {
		wa(() => {
			if (a) {
				clearTimeout(t);
				setTimeout(() => (b = a), 100);
			}
		}, a);
		wb(() => {
			if (!b) {
				clearTimeout(t);
				t = setTimeout(() => {
					a = b;
				}, 500);
			}
		}, b);
	}
</script>

<svelte:window bind:innerHeight={h} />
<button class="t" class:a class:b bind:this={btn}> ↑ </button>

<style lang="scss">
	@import '../break';

	.t {
		transition: 0.3s ease-in-out;
		border-radius: 50%;
		line-height: 1;
		font-size: 20px;
		color: #fff;
		position: fixed;
		bottom: 40px;
		right: 30px;
		height: 40px;
		width: 40px;
		padding-bottom: 6px;
		background: var(--blue);
		z-index: 3;
		box-shadow: rgba(0, 0, 0, 0.2) 0 2px 5px -2px;
		display: none;
		opacity: 0;
		pointer-events: none;

		&.a {
			display: block;
		}

		&.b {
			opacity: 1;
			pointer-events: auto;
		}

		@include s() {
			bottom: 20px;
			right: 20px;
		}
	}
</style>

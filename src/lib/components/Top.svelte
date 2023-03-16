<script>
	import { watch } from '$lib/utils';
	import { onMount } from 'svelte';

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
				if (Math.abs(o - top) < 20) return;
				if (o > top) b = 0;
				else if (o > h / 5) a = 1;
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
				t = setTimeout(() => (b = 1), 50);
			}
		}, a);
		wb(() => {
			if (!b) {
				clearTimeout(t);
				t = setTimeout(() => {
					a = 0;
				}, 300);
			}
		}, b);
	}
</script>

<svelte:window bind:innerHeight={h} />
<button class="t icon i-up" class:a class:b bind:this={btn} />

<style lang="scss">
	@import '../break';

	.t {
		transition: 0.2s ease-in-out;
		border-radius: 50%;
		line-height: 1;
		font-size: 20px;
		color: #fff;
		position: fixed;
		bottom: 40px;
		right: 30px;
		height: 40px;
		width: 40px;
		border: 1px solid rgba(180, 200, 225, 0.3);
		background: rgba(60, 140, 245, 0.8);
		background-clip: content-box;
		z-index: 3;
		box-shadow: rgba(0, 0, 0, 0.2) 0 2px 5px -2px;
		display: none;
		opacity: 0;
		pointer-events: none;
		&:hover {
			opacity: 1;
			border-color: rgba(80, 130, 250, 0.8);
			background: rgba(60, 140, 245, 0.4);
		}

		&.a {
			display: block;
		}

		&.b {
			opacity: 0.8;
			pointer-events: auto;
		}

		@include s() {
			right: 20px;
		}
	}
</style>

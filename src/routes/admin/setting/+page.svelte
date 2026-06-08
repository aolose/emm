<script>
	import G from './geo.svelte';
	import B from './blog.svelte';
	import A from './acc.svelte';
	import T from './about.svelte';
	import C from './backup.svelte';
	import R from './res.svelte';
	import P from './puv.svelte';
	import Ts from './turnstile.svelte';
	import Cf from './cloudflare.svelte';
	import Fw from './firewall.svelte';
	import Ai from './ai.svelte';
	import R2 from './r2.svelte';
	import { onMount } from 'svelte';
	import { load } from './sys';

	onMount(load);
</script>

<div class="m">
	<div class="w">
		<P />
		<Ai />
		<R2 />
		<Ts />
		<Cf />
		<C />
		<B />
		<T />
		<A />
		<R />
		<G />
		<Fw />
	</div>
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	.w {
		columns: 600px;
		column-gap: 12px;
		margin: 0;
		:global(.a) {
			break-inside: avoid;
			margin: 0 0 12px;
			width: 100%;
		}
		@include s() {
			columns: 1;
		}
	}

	.m {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		overflow: auto;
		padding: 12px;
		@include s() {
			padding: 0;
		}
	}
</style>

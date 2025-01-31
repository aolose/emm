<script>
	import G from './geo.svelte';
	import B from './blog.svelte';
	import A from './acc.svelte';
	import T from './about.svelte';
	import C from './backup.svelte';
	import R from './res.svelte';
	import P from './puv.svelte';
	import { onMount } from 'svelte';
	import { load } from './sys';

	onMount(load);
</script>

<div class="m">
	<div class="a">
		<P />
		<C />
		<B />
		<T />
		<A />
		<R />
		<G />
	</div>
</div>

<style lang="scss">
	@use '../../../lib/break' as *;
  .a{
		border-radius: 16px;
		background: var(--bg2);
		max-width: 800px;
		padding: 1px;
		@include s() {
			border-radius: 0;
    }
	}
	.m {
		align-content: flex-start;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		overflow: auto;
		padding:20px;
		flex-direction: column;
		@include s() {
			padding: 0;
			flex-direction: row;
		}
	}
</style>

<script>
	import Filter from './filters.svelte';
	import { delay, trim, watch } from '$lib/utils';

	export let change;
	const dCh = delay(change, 500);
	export let value = '';
	let ctx = {};
	const wc = watch(value, ctx);
	$: {
		value = trim(value);
		wc(
			() => {
				dCh(value, new Set(ctx.value));
			},
			value,
			ctx
		);
	}
</script>

<div class="a">
	<i class="icon i-filter" class:act={ctx.value?.length} on:click={ctx.show} />
	<input bind:value placeholder="search..."/>
	<div class="l" />
	<button class="icon i-search" class:act={value} />
	<Filter bind:ctx />
</div>

<style lang="scss">
	@import '../../break';

	.a {
		background: rgba(0, 0, 0, 0.2);
		display: flex;
		width: 300px;
		margin: 20px auto;
		height: 40px;

		align-items: center;
		@include s() {
			width: 80%;
		}
	}



	.i-filter{
		color: #7889ab;
		background: rgba(80,100,150,.2);
		border-radius: 4px 0 0 4px;
		line-height:  40px;
		padding:  0 10px;
	}
	input {
		flex: 1;
		height: 40px;
		outline: none;
		border: none;
		&::placeholder{
			color: #3b5572;
		}
	}
	button {
		opacity: 0.9;
		transition: 0.2s;
		margin-left: 4px;
		border-radius: 0 4px 4px 0;
		height: 40px;
		width: 40px;
		background: rgba(80,100,150,.2);
		color: #7889ab;
		cursor: pointer;
		&:hover {
			opacity: 1;
		}
	}
	.act{
		background: rgba(80,100,150,.5);
		color: var(--blue);
	}
</style>

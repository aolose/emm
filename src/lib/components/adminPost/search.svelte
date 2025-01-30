<script>
	import Filter from './filters.svelte';
	import { delay, trim } from '$lib/utils';

	let { change, value = '' } = $props();
	let ctx = $state({});
	const dCh = delay(change, 500);
	$effect(() => {
		const val = trim(value);
		if (ctx.value !== val) {
			ctx.value = val;
			dCh(val, new Set(val));
		}
	});
</script>

<div class="a">
	<i class="icon i-filter" class:act={ctx.value?.length} onclick={ctx.show}></i>
	<input bind:value placeholder="search..." />
	<div class="l"></div>
	<i class="icon i-search" class:act={value}></i>
	<Filter bind:ctx />
</div>

<style lang="scss">
	@use '../../break' as *;

	.a {
		background: rgba(0, 0, 0, 0.24);
		display: flex;
		width: 300px;
		margin: 20px auto;
		height: 40px;
		border-radius: 4px;
		align-items: center;
		@include s() {
			width: 80%;
		}
	}

	input {
		flex: 1;
		padding: 0;
		outline: none;
		border: none;

		&::placeholder {
			color: #3b5572;
		}
	}

	.icon {
		top: 1px;
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: 0.3s;
		width: 40px;
		line-height: 1;
		background: transparent;
		color: #4b6c91;
		cursor: pointer;

		&:hover {
			opacity: 1;
		}
	}

	.act {
		color: var(--blue);
	}
</style>

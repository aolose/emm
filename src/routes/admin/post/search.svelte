<script>
	import Filter from './filters.svelte';

	export let value = '';
	let ctx = {};
	$: {
		value = value.replace(/^\s+|\s+$/, '');
	}
</script>

<div class="a">
	<i class="icon i-filter" class:act={ctx.value?.length} on:click={ctx.show} />
	<input bind:value />
	<div class="l" />
	<i class="icon i-search" class:act={value} />
	<Filter bind:ctx />
</div>

<style lang="scss">
	.a {
		display: flex;
		width: 300px;
		margin: 20px auto;
		position: relative;
		height: 40px;
		border-bottom: 1px solid var(--darkgrey);
		align-items: center;
	}

	.icon {
		color: var(--darkgrey);
		font-size: 20px;
		transition: 0.3s ease-in-out;
		cursor: pointer;

		&:hover {
			color: #d0c791;
		}
	}

	.act {
		color: var(--green);
	}

	.l {
		position: absolute;
		bottom: 0;
		right: 50%;
		transition: 0.3s ease-in-out;
		transform: translateX(50%);
		height: 1px;
		background: #394f62;
		width: 0;
	}

	input {
		flex: 1;
		height: 40px;
		outline: none;
		border: none;

		&:focus + .l {
			width: 100%;
		}
	}
</style>

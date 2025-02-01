<script>
	import { stopPropagation } from 'svelte/legacy';
	let { items = $bindable(), inline = 0 } = $props();
	const del = (p) => () => {
		items = items?.filter((a) => a.id !== p.id) || [];
	};
</script>

<div class="o">
	<div class="v" class:i={inline}>
		{#each items || [] as p}
			<div title={`ID: ${p.id}`} class="p" onclick={stopPropagation(del(p))}>
				<span>{p.title || p.name}</span>
				<button class="icon i-close"></button>
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	@use '../../../lib/break' as *;
  .o{
		position: relative;
		height: 100%;
		flex: 1;
		width: 100%;
	}
	.v {
		padding: 20px;
		position: absolute;
		inset: 0;
		overflow: auto;
		display: flex;
		flex-wrap: wrap;
		background: var(--bg2);
		align-content: flex-start;
		border-bottom: 1px solid #16212a;

		&.i {
			padding: 2px 3px;
			height: auto;
			border-radius: 8px;
			min-height: 48px;
			background: var(--bg1);
		}
	}

	.p {
		display: flex;
		border-radius: 4px;
		align-items: center;
		align-self: flex-start;
		min-height: 28px;
		background: linear-gradient(132deg, rgba(28, 39, 62, 0.67), rgba(33, 31, 48, 0.56));
		margin: 3px 2px;

		span {
			padding: 5px 10px;
			@include s() {
				padding: 5px;
			}
		}

		button {
			padding: 5px;
			border-left: 1px solid #171b2a;
			color: #627184;

			&:hover {
				color: #8aa3ab;
			}
		}
	}
</style>

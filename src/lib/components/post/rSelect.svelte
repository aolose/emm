<script>
	export let items = [];
	export let inline = 0;
	const del = (p) => () => {
		items = items.filter((a) => a.id !== p.id);
	};
</script>

<div class="v" class:i={inline}>
	{#each items || [] as p}
		<div title={`ID: ${p.id}`} class="p" on:click|stopPropagation={del(p)}>
			<span>{p.title || p.name}</span>
			<button class="icon i-close" />
		</div>
	{/each}
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	.v {
		padding: 20px;
		height: 150px;
		overflow: auto;
		display: flex;
		flex-wrap: wrap;
		width: 100%;
		flex-grow: 1;
		background: var(--bg2);
		align-content: flex-start;
		border-bottom: 1px solid #16212a;

		&.i {
			padding: 2px 3px;
			height: auto;
			width: 0;
			min-height: 34px;
			border: 1px solid rgba(140, 181, 236, 0.1);
			background: var(--bg3);
		}
	}

	.p {
		display: flex;
		align-items: center;
		align-self: flex-start;
		min-height: 28px;
		background: #20263c;
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

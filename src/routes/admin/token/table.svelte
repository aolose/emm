<script>
	import { run } from 'svelte/legacy';

	let allSet = $state();
	let { items = [], cols = [], sel = $bindable(new Set()) } = $props();
	let st = $state(0);
	run(() => {
		allSet = new Set(
			items.map((a) => {
				return a.id;
			})
		);
		let hs = 0;
		let lf = 0;
		for (const o of items) {
			if (sel.has(o.id)) hs = 1;
			else lf = 1;
		}
		st = 0;
		if (hs) {
			if (lf) st = 1;
			else st = 2;
		}
	});
</script>

<table>
	<thead>
		<tr>
			{#each cols as { name = '', check }}
				<th>
					{name}
					{#if check}
						<div
							class="k"
							onclick={() => {
								if (st === 2) sel = new Set([...sel].filter((a) => !allSet.has(a)));
								else sel = new Set([...sel, ...allSet]);
							}}
							class:act={st}
						>
							{['', '-', '✓'][st]}
						</div>
					{/if}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each items as row}
			<tr>
				{#each cols as { key, cell, check, btn }}
					<td>
						<div>
							{#if cell}{cell(row)}{/if}
							{#if key}{row[key]}{/if}
							{#if check}
								<div
									class="k"
									class:act={sel.has(row.id)}
									onclick={() => {
										if (sel.has(row.id)) sel.delete(row.id);
										else sel.add(row.id);
										sel = new Set([...sel]);
									}}
								>
									✓
								</div>
							{/if}
							{#if btn}
								<button class="icon i-ed" onclick={() => btn(row)}></button>
							{/if}
						</div>
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style lang="scss">
	.k {
		width: 18px;
		height: 18px;
		background: var(--bg2);
		border-radius: 4px;
		border: #1c334a 1px solid;
		margin: 0 auto;
		color: transparent;
		cursor: pointer;

		&.act {
			color: #7189a1;
		}
	}

	table {
		font-size: 14px;
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: var(--bg3);

		th {
			line-height: 3;
			font-weight: 400;
		}
	}

	tbody {
		tr {
			&:nth-child(2n) {
				background: var(--bg2);
			}
		}
	}

	tr {
	}

	td,
	th {
		padding: 0 10px;

		div {
			height: 40px;
			display: flex;
			align-items: center;
			justify-content: center;
			text-align: center;
		}
	}

	th {
	}
</style>

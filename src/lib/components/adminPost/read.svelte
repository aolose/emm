<script>
	import { fade } from 'svelte/transition';
	import Pg from '$lib/components/pg.svelte';
	import Ld from '$lib/components/loading.svelte';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { time, watch } from '$lib/utils';
	export let act = 0;
	export let close;
	export let id = 0;
	const wa = watch(act, id);
	let page = 1;
	let ls = [];
	let total = 1;
	let ld = 0;
	$: {
		wa(
			() => {
				if (act && id) {
					go();
				}
			},
			act,
			id
		);
	}

	function go(n = 1) {
		if (!act || !id) return;
		ld = 1;
		page = n;
		req('visitor', { p: page, id }, { method: method.GET })
			.then((a) => {
				total = a.total;
				ls = a.items;
			})
			.finally(() => (ld = 0));
	}
</script>

{#if act && id}
	<div transition:fade class="a">
		<div class="c">
			<span>visitor</span>
			<button
				class="icon i-close"
				on:click={() => {
					act = 0;
					close();
				}}
			/>
		</div>
		<div class="b">
			{#if !ls.length}
				<p>no visitor</p>
			{/if}
			{#each ls as { ip, _geo, createAt, ua }}
				<div class="r">
					<span>{time(createAt)}</span>
					<span class="i">{ip}</span>
					<span class="g">{_geo || ''}</span>
					<p>{ua}</p>
				</div>
			{/each}
		</div>
		<Pg {total} {page} {go} />
		<Ld act={ld} />
	</div>
{/if}

<style lang="scss">
	.r {
		background: #192533;
		border-radius: 5px;
		margin-bottom: 10px;
		font-size: 14px;
		display: flex;
		flex-wrap: wrap;
		span {
			flex: 1;
			padding: 5px 10px;
			flex-shrink: 0;
		}
		.i {
			color: orange;
		}
		.g {
			text-align: right;
			color: #4b93d9;
		}
		p {
			width: 100%;
			background: #0a1117;
			padding: 5px;
			font-size: 13px;
		}
	}
	.c {
		button {
			position: absolute;
			right: 20px;
			top: 20px;
			font-size: 20px;
		}
		span {
			display: block;
			font-size: 18px;
			padding: 20px;
			text-align: center;
		}
	}
	.a {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--bg1);
		z-index: 2;
		display: flex;
		flex-direction: column;
		padding-bottom: 10px;
	}
	.b {
		flex: 1;
		padding: 20px;
		overflow: auto;
	}
</style>

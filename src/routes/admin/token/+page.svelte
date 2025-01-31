<script>
	import { permission, pmsName } from '$lib/enum';
	import { onMount } from 'svelte';
	import { method } from '$lib/enum';
	import { req } from '$lib/req';
	import { time } from '$lib/utils';
	import Ld from '$lib/components/loading.svelte';
	import Table from './table.svelte';
	import Panel from './panel.svelte';
	import Pg from '$lib/components/pg.svelte';
	import { slidLeft } from '$lib/transition';
	import { confirm } from '$lib/store';

	let ta = $state(0);
	let page = $state(1);
	let total = $state(1);
	let items = $state([]);
	let loading = $state(0);
	let edit = $state();

	const go = (n = 1) => {
		loading = 1;
		items = [];
		page = n;
		req(['require', 'code'][ta], { page }, { method: method.GET })
			.then((d) => {
				({ total, items } = d);
				if (ta) {
					items.forEach((a) => {
						a._reqs?.forEach((o) => (o.type = a.type));
					});
				}
			})
			.finally(() => (loading = 0));
	};

	onMount(() => {
		go();
	});

	function add() {
		edi();
	}

	function edi(v) {
		edit(ta, v).then((a) => {
			if (!a) return;
			const d = items.find((n) => n.id === a.id);
			if (d) Object.assign(d, a);
			else items.unshift(a);
			items = [...items];
		});
	}

	const btnClick = (a) => edi(a);

	function del() {
		confirm('sure to delete?').then((ok) => {
			if (!ok) return;
			req(['require', 'code'][ta], [...ids].join(), { method: method.DELETE }).then(() => {
				items = items.filter((a) => !ids.has(a.id));
				if (!items.length) go(page === 1 ? 1 : page - 1);
				ids = new Set();
			});
		});
	}

	let cols = $derived(
		[
			[
				{ check: true },
				{ name: 'name', key: 'name' },
				{ name: 'type', cell: ({ type }) => pmsName[permission[type]] },
				{ name: 'create at', cell: ({ createAt }) => time(createAt) },
				{ name: 'edit', btn: btnClick, detail: '_post' }
			],
			[
				{ check: true },
				{ name: 'code', key: 'code' },
				{ name: 'type', cell: ({ type }) => pmsName[permission[type]] },
				{ name: 'expire', cell: ({ expire }) => (expire > 0 ? time(expire) : '∞') },
				{ name: 'create at', cell: ({ createAt }) => time(createAt) },
				{ name: 'times', cell: ({ times }) => (times > 0 ? times : '∞') },
				{ name: 'share', cell: ({ share }) => (share ? 'Y' : 'N') },
				{ name: 'used', cell: ({ used }) => used || 0 },
				{ detail: '_reqs', btn: btnClick }
			]
		][ta]
	);

	let ids = $state(new Set());
	let siz = $derived(ids.size);
	const act = (n) => () => {
		if (ta !== n) {
			ids = new Set();
			ta = n;
			go();
		}
	};
</script>

<div class="x">
	<div class="a">
		<div class="t">
			<div class="v">
				<button class:act={ta === 0} onclick={act(0)}>permissions</button>
				<button class:act={ta === 1} onclick={act(1)}>tickets</button>
			</div>
			<div class="o">
				<button class="icon i-add" onclick={add}></button>
				{#if siz}
					<button class="icon i-del" onclick={del} transition:slidLeft|global>{siz}</button>
				{/if}
			</div>
		</div>
		<div class="ls">
			<Table {items} {cols} bind:sel={ids} />
		</div>
		<Ld act={loading} />
		<Pg {page} {total} {go} />
	</div>
	<Panel bind:edit />
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	.t {
		justify-content: space-between;
		display: flex;
		padding: 12px 20px;
		@include s() {
			padding-right: 5px;
		}

		button {
			padding: 0 10px;
		}
	}

	.v,
	.o {
		display: flex;
	}

	.v {
		border-radius: 4px;

		button {
			text-align: center;
			width: 100px;
			opacity: 0.8;
			font-size: 13px;
			color: #5f768f;
			padding: 5px;
			border-right-width: 0;

			&:hover {
				opacity: 1;
			}
		}
    button:not(.act){
			background: none;
		}
		.act {
			color: #fff;
			border-color: transparent;
		}
	}

	.x {
		height: 100%;
		background: var(--bg3);
	}

	.a {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg1);
		padding-bottom: 15px;
		@include s() {
			padding-bottom: 5px;
		}
	}

	.ls {
		flex: 1;
		overflow: auto;
		@include s() {
			margin-bottom: 5px;
			&::-webkit-scrollbar {
				height: 5px;
			}
		}
	}
</style>

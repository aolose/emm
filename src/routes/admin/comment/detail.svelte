<script>
	import { run } from 'svelte/legacy';

	import Cm from '$lib/components/comment/cm.svelte';
	import Item from './item.svelte';
	import { watch } from '$lib/utils';
	import { req } from '$lib/req';
	import { cmStatus, method } from '$lib/enum';
	import { confirm } from '$lib/store';
	import Ld from '$lib/components/loading.svelte';
	import Pg from '$lib/components/pg.svelte';
	import { tick } from 'svelte';

	let { close, d = $bindable({}), filter } = $props();
	let ban = $state(0);
	const wip = watch(0);
	const wid = watch(0);
	let ls = $state([]);
	let page = $state(1);
	let total = $state(1);
	let ld = $state(0);
	const go = (n) => {
		page = n;
		const { id } = d;
		req(
			'cmLs',
			{
				topic: id,
				page
			},
			{ method: method.GET }
		)
			.then(({ items, total: t } = {}) => {
				if (id !== d.id) return;
				total = t;
				ls = items || [];
			})
			.finally(() => {
				ld = 0;
			});
	};
	run(() => {
		wid(() => {
			ls = [];
			ld = 1;
			page = 1;
			total = 1;
			go(page);
		}, d.id);
		wip(() => {
			if (d.isAdm) return;
			ban = 0;
			const { ip } = d;
			if (ip) {
				req('bip', ip).then((a) => {
					if (a && ip === d.ip) {
						ban = 1;
					}
				});
			}
		}, d.ip);
	});
	const set = (m) => () => {
		const a = d;
		req('cm', { id: a.id, state: m, isAdm: 1 }).then(() => {
			d.state = m;
			filter();
		});
	};
	let el = $state();
	const del = (id) => () => {
		confirm('sure to delete?').then((a) => {
			if (a)
				req('cm', id, { method: method.DELETE }).then(() => {
					filter(id);
					close();
				});
		});
	};
	const done = (id) => (a) => {
		if (id === d.id) {
			ls = ls.concat(a);
			tick().then(() => {
				el.scrollTop = el.scrollHeight;
			});
		}
	};
</script>

<div class="a">
	<div class="h">
		<Item detail={1} {d} />
		<button class="icon i-close" onclick={close}></button>
	</div>
	<Cm
		admin={1}
		done={done(d.id)}
		reply={{
			topic: d.topic || d.id,
			cm: d.id,
			name: d._name
		}}
	/>
	<div class="b">
		{#if !d.isAdm}
			<button class="icon i-ip" class:act={ban}></button>
		{/if}
		{#if !d.isAdm}
			<button
				class:act={d.state === cmStatus.Reject}
				class="icon i-fbi"
				onclick={set(cmStatus.Reject)}
			></button>
		{/if}
		{#if !d.isAdm}
			<button
				class="icon i-ok"
				class:act={d.state === cmStatus.Approve}
				onclick={set(cmStatus.Approve)}
			></button>
		{/if}
		<button class="icon i-del" onclick={del(d.id)}></button>
	</div>
	<div class="l">
		<div class="ls" bind:this={el}>
			{#each ls as i}
				<Item topic={d.id} d={i} />
			{/each}
			<Ld act={ld} />
		</div>
		<Pg {page} {total} {go} length={3} />
	</div>
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	.h {
		.i-close {
			display: none;
			@include s() {
				display: block;
				top: 10px;
				padding: 10px;
				position: absolute;
				right: 5px;
				font-size: 24px;
				color: #1c93ff;
				opacity: 0.5;
			}
		}
	}

	.a {
		flex: 1;
		display: flex;
		flex-direction: column;
		@include s() {
			flex: none;
			width: 50%;
		}
	}

	.b {
		position: absolute;
		right: 10px;
		top: 10px;
		padding: 10px;
		@include s() {
			right: 40px;
		}
	}

	button {
		padding: 0 5px;
		transition: 0.1s;
		opacity: 0.5;
	}

	.act {
		opacity: 1;

		&.i-ip {
			color: red;
		}

		&.i-fbi {
			color: orangered;
		}

		&.i-ok {
			color: greenyellow;
		}

		&.i-del {
			color: #fff;
		}
	}

	.l {
		flex-grow: 1;
		min-height: 200px;
		display: flex;
		flex-direction: column;
		padding-bottom: 10px;
		@include s() {
			min-height: 0;
			height: 0;
		}
	}

	.ls {
		flex: 1;
		overflow: auto;
	}
</style>

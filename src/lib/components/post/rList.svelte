<script>
	import S from './rSelect.svelte';
	import Ld from '$lib/components/loading.svelte';
	import Pg from '$lib/components/pg.svelte';
	import { fade } from 'svelte/transition';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { delay, trim, watch } from '$lib/utils';
	import { onMount } from 'svelte';

	let { type, permission, select = $bindable() } = $props();
	let sc = $state('');
	let s = $state([]);
	let page = $state(1);
	let total = $state(1);
	let items = $state([]);
	let ld = $state(0);
	let hide = $state(0);
	let ok = $state();
	let cancel = $state();
	let init = $state(0);
	let clear = () => (s = []);
	const ws = watch(sc);

	function go(n = 1) {
		page = n;
		ld = 1;
		items = [];
		let q = 'posts';
		const k = trim(sc);
		const o = { page: n, size: 30 };
		if (k) o.sc = k;
		const c = {};
		if (type) {
			q = 'require';
			o.type = permission;
			c.method = method.GET;
		}
		req(q, o, c)
			.then((p) => {
				const { total: t, items: i = [] } = p;
				if (i) items = i;
				total = t;
			})
			.finally(() => {
				ld = 0;
			});
	}

	const delayGo = delay(go, 600);

	function ch(it) {
		return () => {
			const x = !s.find((a) => a.id === it.id);
			if (x) {
				const o = { id: it.id, title: it.title || it.title_d || it.name };
				if (type) o.type = permission;
				s = s.concat(o);
			} else {
				s = s.filter((a) => a.id !== it.id);
			}
		};
	}

	onMount(() => {
		select = (d) => {
			hide = 1;
			s = [...(d || [])];
			return new Promise((r) => {
				ok = () => r([...s]);
				cancel = () => r();
			}).finally(() => {
				hide = 0;
			});
		};
	});
	$effect(() => {
		sc = trim(sc, true);
		ws(() => {
			delayGo();
		}, sc);
		if (hide)
			if (!init) {
				init = 1;
				go();
			}
	});
</script>

{#if hide}
	<div class="a" transition:fade|global>
		<div class="t">
			<span>{type ? 'select permission' : 'select posts'}</span>
			<div class="bn">
				<button title="clear" class="icon i-no" onclick={clear}></button>
				<button title="ok" class="icon i-ok" onclick={ok}></button>
				<button title="cancel" class="icon i-close" onclick={cancel}></button>
			</div>
		</div>
		<div class="c">
			<S bind:items={s} />
		</div>
		<div class="s icon i-search" class:act={sc}>
			<input placeholder="search posts" bind:value={sc} />
		</div>
		<div class="b">
			<div class="p m">
				<div class="k"></div>
				<span>ID</span>
				<span>{type ? 'name' : 'title'}</span>
			</div>
			<div class="ls">
				{#each items as it}
					<div class="p">
						<div onclick={ch(it)} class="k" class:s={s && s.find((a) => a.id === it.id)}>✓</div>
						<span>{it.id}</span>
						<span>{it.title || it.title_d || it.name}</span>
					</div>
				{/each}
			</div>
			<Ld act={ld} />
			<Pg {total} {page} {go} />
		</div>
	</div>
{/if}

<style lang="scss">
	@use 'sass:color';
	.s {
		display: flex;
		padding: 8px 8px 8px 14px;
		align-items: center;
		color: var(--darkgrey);

		&.act {
			color: #1c93ff;
		}

		input {
			color: var(--darkgrey-h);
			padding: 0 25px;
			border-radius: 100px;
			line-height: 40px;
			margin-left: 7px;
			width: 0;
			flex: 1;
			border: 0;
			background: var(--bg2);

			&::placeholder {
				color: var(--darkgrey);
			}
		}
	}

	.p {
		display: flex;
		align-items: center;
		padding: 5px 30px;

		span {
			min-width: 100px;
		}


		&:hover {
			background: color.adjust(#0b3054, $alpha: -0.5);
		}
	}

	.m {
		pointer-events: none;
		background: var(--bg2);

		.k {
			opacity: 0;
		}
	}

	.t {
		height: 40px;
		display: flex;
		align-items: center;
		padding: 0 20px;
		justify-content: space-between;

		.i-ok {
			padding: 0 20px;
		}

		button {
			line-height: 2;
			transition: 0.2s;
			opacity: 0.6;

			&:hover {
				opacity: 1;
			}
		}
	}

	.c {
		flex: 1;
		flex-direction: column;
		display: flex;
		align-items: center;
	}

	.b {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: auto;
	}

	.ls {
		padding: 20px 0;
		background: color.adjust(black, $alpha: -0.8);
		overflow: auto;
		flex: 1;
		margin-bottom: 10px;
	}

	.a {
		z-index: 5;
		padding-bottom: 10px;
		display: flex;
		flex-direction: column;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--bg1);
		border-radius: inherit;
	}

	.k {
		border-radius: 4px;
		background: var(--bg3);
		width: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		height: 18px;
		border: 1px solid #1d2e48;
		color: transparent;
		cursor: pointer;
		margin-right: 20px;
		padding: 0 !important;

		&.s {
			color: #fff;
		}
	}
</style>

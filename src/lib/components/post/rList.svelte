<script>
	import S from './rSelect.svelte';
	import Ld from '$lib/components/loading.svelte';
	import Pg from '$lib/components/pg.svelte';
	import { fade } from 'svelte/transition';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { delay, trim, watch } from '$lib/utils';

	export let type;
	export let permission;
	let sc = '';
	let s = [];
	let page = 1;
	let total = 1;
	let items = [];
	let ld = 0;
	let hide = 0;
	let ok;
	let cancel;
	let init = 0;
	let clear = () => (s = []);
	const ws = watch(sc);
	export const select = (d) => {
		hide = 1;
		s = [...(d || [])];
		return new Promise((r) => {
			ok = () => r([...s]);
			cancel = () => r();
		}).finally(() => {
			hide = 0;
		});
	};
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

	$: {
		sc = trim(sc, true);
		ws(() => {
			delayGo();
		}, sc);
		if (hide)
			if (!init) {
				init = 1;
				go();
			}
	}
</script>

{#if hide}
	<div class="a" transition:fade|global>
		<div class="t">
			<span>{type ? 'select permission' : 'select posts'}</span>
			<div class="bn">
				<button title="clear" class="icon i-no" on:click={clear} />
				<button title="ok" class="icon i-ok" on:click={ok} />
				<button title="cancel" class="icon i-close" on:click={cancel} />
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
				<div class="k" />
				<span>ID</span>
				<span>{type ? 'name' : 'title'}</span>
			</div>
			<div class="ls">
				{#each items as it}
					<div class="p">
						<div on:click={ch(it)} class="k" class:s={s && s.find((a) => a.id === it.id)}>✓</div>
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
		padding: 2px 1.5em 0 0.8em;
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

		&:nth-child(2n) {
			background: color.adjust(#122336, $alpha: -0.8);
		}

		&:hover {
			background: color.adjust(#0b3054, $alpha: -0.5);
		}
	}

	.m {
		pointer-events: none;
		background: var(--bg1);
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

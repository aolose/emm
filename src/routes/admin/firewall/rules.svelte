<script>
	import Pg from '$lib/components/pg.svelte';
	import { confirm } from '$lib/store';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { onMount } from 'svelte';
	import { watch, time } from '$lib/utils';
	import Ld from '$lib/components/loading.svelte';
	export let close;
	let total = 1;
	let p = 1;
	export let pop;
	let ta = 0;
	let ld = 0;
	const wa = watch(ta);
	$: wa(() => {
		ls = [];
		go(1);
	}, ta);
	let go = (n) => {
		p = n;
		const api = ['rules', 'blk'][ta];
		ld = 1;
		req(api, new Uint8Array([p, 20]))
			.then((d) => {
				ls = d.items;
				total = d.total;
			})
			.finally(() => (ld = 0));
	};
	const add = () => {
		pop(2).then((d) => {
			if (!d) return;
			req('rule', d).then((id) => {
				d.id = id;
				ls = [d, ...ls];
			});
		});
	};

	const del = (id) => {
		confirm('sure to delete?').then((ok) => {
			if (ok) {
				const api = ['rules', 'blk'][ta];
				req('rules', id, { method: method.DELETE }).then(() => {
					ls = ls.filter((a) => a.id !== id);
				});
			}
		});
	};

	const edit = (da) => {
		pop(1, da).then((d) => {
			if (!d) return;
			d.id = da.id;
			req('rule', d).then(() => {
				const idx = ls.indexOf(da);
				if (idx > -1) {
					ls = [...ls];
					ls[idx] = d;
				}
			});
		});
	};
	let ls = [];

	onMount(() => {
		go(1);
	});
</script>

<div class="a">
	<div class="b">
		<div class="d">
			<div class="t">
				<button class:act={!ta} on:click={() => (ta = 0)}>rules</button>
				<button class:act={ta} on:click={() => (ta = 1)}>blackList</button>
			</div>
			<s />
			{#if !ta}<button on:click={add} class="icon i-add" />{/if}
			<button on:click={close} class="icon i-close" />
		</div>
	</div>
	<div class="e">
		<div class="c">
			<div class="q">
				{#each ls as r}
					{#if ta}
						<div class="u act">
							<div class="i">
								<div class="icon i-ip"><span>{r.ip}</span></div>
								<div class="icon i-geo"><span>{r._geo}</span></div>
							</div>
							<div class="r">
								<span class="icon i-fbi" />
								<p>{time(r.createAt)}</p>
								<s />
								<button class="icon i-del" on:click={() => del(r.id)} />
							</div>
						</div>
					{:else}
						<div class="u" class:act={r.active}>
							<div class="i">
								{#if r.ip&&!r.trigger}
									<div class="icon i-ip"><span>{r.ip}</span></div>
								{/if}
								{#if r.status}
									<div class="icon i-status"><span>{r.status}</span></div>
								{/if}
								{#if r.path}
									<div class="icon i-target"><span>{r.path}</span></div>
								{/if}
								{#if r.country&&!r.trigger}
									<div class="icon i-geo"><span>{r.country}</span></div>
								{/if}
								{#if r.headers}
									<div class="icon i-set">
										<pre>{r.headers.replace(/:/g,': ')}</pre>
									</div>
								{/if}
							</div>
							<div class="r">
								{#if r.log&&!r.trigger}
									<span class="icon i-log" />
								{/if}
								{#if r.forbidden||r.trigger}
									<span class="icon i-fbi" />
								{/if}
								<span class="m">{r.mark || ''}</span>
								<button class="icon i-del" on:click={() => del(r.id)} />
								<button class="icon i-ed" on:click={() => edit(r)} />
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
		<Pg {total} {go} />
		<Ld act={ld} />
	</div>
</div>

<style lang="scss">
	@import '../../../lib/break';
	.q {
		overflow: auto;
	  position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
	}
	.e {
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.i-close {
		display: none;
		@include s() {
			display: block;
		}
	}
	.t {
		background: var(--bg2);
		border-radius: 6px;
		button {
			color: var(--darkgrey-h);
			transition: 0.2s ease-in-out;
			font-size: 13px;
			line-height: 1;
			height: 30px;
			padding: 0 15px !important;
			border-radius: inherit;
		}
		.act {
			color: #eee;
			background: #26548c;
		}
	}
	s {
		flex: 1;
	}

	.i-set {
		background: rgba(0, 0, 0, 0.1);
	}

	.u {
		margin: 10px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--bg0);
		button {
			opacity: 0.5;

			&:hover {
				opacity: 1;
				color: #fff;
			}
		}
	}

	.act {
		background: #0f1c38;

		.m {
			color: #94abc0;
		}

		.i {
			span,
			div {
				color: #bfc6d9;
			}
		}

		.r {
			background: #070e1e;
		}
	}

	pre {
		flex: 1;
		font-size: 13px;
		padding: 0 10px;
	}

	.i {
		display: flex;
		flex-wrap: wrap;

		div {
			font-size: 14px;
			padding: 5px 10px;
			flex-grow: 1;
			width: 50%;

			span {
				color: #959ca8;
				padding-left: 10px;
			}
		}

		.i-set {
			line-height: 2;
			align-items: flex-start;
			display: flex;
			width: 100%;
		}
	}

	span.icon {
		margin-right: 10px;
		opacity: 0.7;
		min-width: 20px;
		padding: 0;
	}

	.i-log {
		color: #00d2ff;
	}

	.i-fbi {
		color: #f11b86;
	}

	.r {
		border-top: 1px solid rgba(0, 0, 0, 0.2);
		background: #1d2125;
		width: 100%;
		align-items: center;
		height: 30px;
		display: flex;
		padding: 0 10px;
		p {
			font-size: 13px;
		}
	}

	.m {
		font-size: 13px;
		flex: 1;
	}

	button {
		padding: 0 5px;
	}

	.d {
		display: flex;
		align-items: center;
		padding: 0 0 0 10px;
		height: 60px;

		button {
			padding: 10px 20px;
			@include s() {
				padding: 10px 15px;
			}
			&:hover {
				color: #fff;
			}
		}
	}

	h1 {
		flex: 1;
		padding: 0 10px;
		color: #627079;
		font-weight: 400;
		font-size: 14px;
	}

	.a {
		border-left: 1px solid #141e28;
		padding: 0 0 10px;
		height: 100%;
		display: flex;
		flex-direction: column;
		@include s() {
			width: 100%;
		}
	}

	.b {
	}

	.c {
		flex: 1;
		margin-bottom: 10px;
	}
</style>

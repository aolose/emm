<script>
	import { run } from 'svelte/legacy';

	import Pg from '$lib/components/pg.svelte';
	import { confirm, fwRespLs } from '$lib/store';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { onMount } from 'svelte';
	import { watch, time, diffObj, getErr } from '$lib/utils';
	import Ld from '$lib/components/loading.svelte';

	let total = $state(1);
	let p = 1;
	let { close, pop } = $props();
	let ta = $state(0);
	let ld = $state(0);
	const wa = watch(ta);
	const fix = (d) => {
		if (ta !== 2) {
			if (d.trigger) {
				if (d.country) d.country = '';
				if (d.method) d.method = '';
				if (d.ip) d.ip = '';
			} else {
				if (d.status) d.status = '';
				if (d.times) d.times = -1;
			}
			if (d.respId === 0) d.respId = -1;
		}
	};
	let go = (n) => {
		p = n;
		const api = ['rules', 'bks', 'fwRsp'][ta];
		ld = 1;
		const isRsp = ta === 2;
		req(api, isRsp ? undefined : new Uint16Array([p, 20]), {
			method: isRsp ? method.GET : method.POST
		})
			.then((d) => {
				if (isRsp) {
					fwRespLs.set(d);
					ls = d;
				} else {
					ls = d.items;
					total = d.total;
				}
			})
			.finally(() => (ld = 0));
	};
	const add = () => {
		pop(ta ? 4 : 2).then((d) => {
			if (!d) return;
			fix(d);
			const api = ta ? 'fwRsp' : 'rule';
			req(api, d).then((id) => {
				d.id = id;
				ls = [{ ...d }, ...ls];
				if (ta === 2) fwRespLs.set(ls);
			});
		});
	};

	const del = (id) => {
		confirm('sure to delete?').then((ok) => {
			if (ok) {
				const api = ['rules', 'blk', 'fwRsp'][ta];
				req(api, id, { method: method.DELETE }).then(() => {
					ls = ls.filter((a) => a.id !== id);
					if (ta === 2) fwRespLs.set(ls);
				});
			}
		});
	};

	const edit = (da) => {
		pop(ta ? (ta === 2 ? 5 : 3) : 1, { ...da }).then((d) => {
			if (!d) return;
			fix(d);
			let df = diffObj(da, d);
			df.id = da.id;
			if (ta === 1) df = { id: da.id, respId: df.respId, mark: df.mark };
			const api = ['rule', 'blk', 'fwRsp'][ta];
			req(api, df)
				.then(() => {
					const idx = ls.indexOf(da);
					if (idx > -1) {
						ls = [...ls];
						ls[idx] = { ...da, ...d };
					}
					if (ta === 2) fwRespLs.set(ls);
				})
				.catch((e) => confirm(getErr(e), '', 'ok'));
		});
	};
	let ls = $state([]);
	const rspName = (id) => $fwRespLs.find((a) => a.id === id)?.name || '';
	onMount(() => {
		go(1);
		return fwRespLs.subscribe(() => (ls = [...ls]));
	});
	run(() => {
		wa(() => {
			ls = ta === 2 ? $fwRespLs : [];
			go(1);
		}, ta);
	});
</script>

<div class="a">
	<div class="b">
		<div class="d">
			<div class="t">
				<button class:act={!ta} onclick={() => (ta = 0)}>rules</button>
				<button class:act={ta === 1} onclick={() => (ta = 1)}>blackList</button>
				<button class:act={ta === 2} onclick={() => (ta = 2)}>response</button>
			</div>
			<s></s>
			{#if !ta || ta === 2}
				<button onclick={add} class="icon i-add"></button>
			{/if}
			<button onclick={close} class="icon i-close"></button>
		</div>
	</div>
	<div class="e">
		<div class="c">
			<div class="q">
				{#each ls as r}
					{#if ta === 1}
						<div class="u act">
							<div class="i">
								<div class="icon i-ip"><span>{r.ip}</span></div>
								<div class="icon i-geo"><span>{r._geo}</span></div>
								{#if r.respId > 0}
									<div class="icon i-drop"><span>{rspName(r.respId)}</span></div>
								{/if}
							</div>
							<div class="r">
								{#if r.mark}
									<span class="m">{r.mark}</span>
								{/if}
								<p>{time(r.createAt)}</p>
								<s></s>
								<button class="icon i-del" onclick={() => del(r.id)}></button>
								<button class="icon i-ed" onclick={() => edit(r)}></button>
							</div>
						</div>
					{:else if ta === 2}
						<div class="u">
							<div class="i">
								<div class="icon i-tag"><span>{r.name}</span></div>
								<div class="icon i-target"><span>{r.status}</span></div>
							</div>
							<div class="r">
								<p>{r.headers || ''}</p>
								<s></s>
								<button class="icon i-del" onclick={() => del(r.id)}></button>
								<button class="icon i-ed" onclick={() => edit(r)}></button>
							</div>
						</div>
					{:else}
						<div class="u" class:act={r.active} class:tr={r.trigger}>
							<div class="i">
								{#if r.respId > 0}
									<div class="icon i-drop"><span>{rspName(r.respId)}</span></div>
								{/if}
								{#if r.ip && !r.trigger}
									<div class="icon i-ip"><span>{r.ip}</span></div>
								{/if}
								{#if r.status}
									<div class="icon i-status"><span>{r.status}</span></div>
								{/if}
								{#if r.path}
									<div class="icon i-target"><span>{r.path}</span></div>
								{/if}
								{#if r.country && !r.trigger}
									<div class="icon i-geo"><span>{r.country}</span></div>
								{/if}
								{#if r.headers}
									<div class="icon i-set">
										<pre>{r.headers.replace(/:/g, ': ')}</pre>
									</div>
								{/if}
							</div>
							<div class="r">
								{#if r.log && !r.trigger}
									<span class="icon i-log"></span>
								{/if}
								<span class="m">{r.mark || ''}</span>
								<button class="icon i-del" onclick={() => del(r.id)}></button>
								<button class="icon i-ed" onclick={() => edit(r)}></button>
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
	@use '../../../lib/break' as *;

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
			padding-right: 10px;
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

		.i-set,
		.i-drop {
			line-height: 2;
			align-items: flex-start;
			display: flex;
			width: 100%;
		}

		.i-drop {
			border-top: 1px solid rgba(0, 0, 0, 0.3);
			background: rgba(0, 0, 0, 0.1);
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

	.tr {
		&.act {
			.i {
				background: #0f3826;
			}
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	import { req } from '$lib/req';
	import Itm from './item.svelte';
	import Pg from '$lib/components/pg.svelte';
	import Ck from '$lib/components/check.svelte';
	import Ld from '$lib/components/loading.svelte';
	import Ft from './pop.svelte';
	import Ru from './rules.svelte';
	import { watch } from '$lib/utils';
	import { small } from '$lib/store';

	let view = 0;
	let sty;
	let pop;
	let sel = new Set();
	let tab = 0;
	let ls = [];
	let lastL = 0;
	let loop = 1;
	const size = 10;
	let p = 1;
	let total;
	let ld = false;
	let filter = {};
	let hasF = 0;
	const lsWatch = watch(tab, p);
	$: {
		sty = $small ? `transform:translate3d(${(-view * 100) / 2}%,0,0)` : '';
		lsWatch(
			() => {
				lastL = 0;
				ls = [];
			},
			tab,
			p
		);
	}

	function tabCk(a) {
		return () => {
			if (tab === a) return;
			tab = a;
			loadLog(1);
		};
	}

	function fx() {
		const l = [];
		const s = new Set();
		ls.forEach((a) => {
			if (a && a.length) {
				const k = a[0] + a[1]+a[2];
				if (s.has(k)) return;
				s.add(k);
				l.push(a);
			}
		});
		l.sort((a, b) => b[0] - a[0]);
		if (l.length) lastL = (l[0] || [0])[0];
		ls = l.slice(0, size);
	}

	function loadLog(page) {
		ld = true;
		const opt = {
			...filter,
			page: p,
			type: tab,
			size
		};
		if (page) {
			opt.page = p = page;
		} else opt.t = lastL;
		req('log', opt)
			.then((r) => {
				if (lastL) {
					ls = [...r.data, ...ls];
				} else {
					ls = r.data;
				}
				total = r.total;
				fx();
			})
			.finally(() => (ld = false));
	}

	onMount(() => {
		let t = setInterval(() => {
			if (loop) loadLog();
		}, 3e3);
		loadLog(1);
		return () => clearInterval(t);
	});

	function ck(k) {
		return () => {
			if (sel.has(k)) sel.delete(k);
			else sel.add(k);
			sel = new Set(sel);
		};
	}

	function search() {
		pop(0, filter).then((d) => {
			if (!d) return;
			filter = d;
			loadLog(1);
		});
	}
</script>

<div class="m">
	<div class="a" style={sty}>
		<div class="c">
			<div class="d">
				<div class="h">
					<h1>Logs</h1>
					<s />
					<div class="tb" class:ac={tab}>
						<span on:click={tabCk(0)}>real-time</span>
						<span on:click={tabCk(1)}>firewall</span>
						<i />
					</div>
					<Ck name="auto" bind:value={loop} />
					<button on:click={() => loadLog()} class="icon i-refresh" />
					<button class="icon i-filter" class:act={hasF} on:click={search} />
					<button class="icon i-set" on:click={() => (view = 1)} />
				</div>
			</div>
			<div class="e">
				<div class="b">
					{#each ls as d (d[0] + d[1] +d[2] +tab)}
						<Itm {ck} data={d} {sel} isDb={tab} />
					{/each}
				</div>
				<Pg {total} page={p} go={loadLog} />
			</div>
			<Ld act={ld} />
		</div>
		<div class="sd">
			<Ru {pop} close={() => (view = 0)} />
		</div>
	</div>
	<Ft bind:pop />
</div>

<style lang="scss">
	@import '../../../lib/break';
	.i-set {
		display: none;
		@include s() {
			display: block;
		}
	}
	.m {
		width: 100%;
		height: 100%;
		@include s() {
			overflow: hidden;
		}
	}

	.i-filter {
		&.act {
			color: #1c93ff;
		}
	}

	.sd {
		width: 600px;
		display: flex;
		flex-direction: column;
		height: 100%;
		@include s() {
			width: 50%;
		}
	}

	.f0 {
		flex: 1;
	}

	.g {
		display: flex;
	}

	.tb {
		margin-right: 10px;
		display: flex;
		height: 20px;
		align-items: center;
		border-radius: 100px;
		background: var(--bg0);

		i {
			border-radius: inherit;
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			right: 50%;
			transition: 0.1s ease-in-out;
			background: var(--darkgrey);
		}

		span {
			height: 100%;
			cursor: pointer;
			transition: 0.1s ease-in-out;
			font-size: 12px;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 80px;
			line-height: 1;
			color: #8aa4af;
			z-index: 3;

			& + span {
				color: #858fa1;
				margin-left: -10px;
			}
		}
	}

	.ac {
		i {
			transform: translateX(100%);
		}

		span {
			color: #858fa1;

			& + span {
				color: #8aa4af;
			}
		}
	}

	h1 {
		font-weight: 400;
		font-size: 18px;
		padding: 0 10px;
		color: #6d7f94;
		@include s() {
			display: none;
		}
	}

	.h {
		height: 60px;
		align-items: center;
		background: var(--bg2);
		display: flex;
		width: 100%;
		padding: 0 10px;

		s {
			flex: 1;
		}
	}

	.d {
		border-bottom: 1px solid #1e222c;
		flex-wrap: wrap;
		display: flex;
		background: var(--bg2);
	}

	.e {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg2);
		padding-bottom: 10px;
	}

	button {
		margin-right: 20px;
	}

	.a {
		width: 100%;
		height: 100%;
		display: flex;
		@include s() {
			width: 200%;
			transition: 0.3s ease-in-out;
		}
	}

	.c {
		display: flex;
		flex-direction: column;
		height: 100%;
		//width: 600px;
		width: 100%;
		@include s() {
			width: 50%;
			flex-shrink: 0;
		}
	}

	.b {
		flex: 1;
		height: 100%;
		overflow: auto;
		margin-bottom: 15px;
	}
</style>

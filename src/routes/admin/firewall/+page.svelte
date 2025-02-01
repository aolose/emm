<script>
	import { run } from 'svelte/legacy';

	import { onMount } from 'svelte';
	import { req } from '$lib/req';
	import Itm from './item.svelte';
	import Pg from '$lib/components/pg.svelte';
	import Ck from '$lib/components/check.svelte';
	import Ld from '$lib/components/loading.svelte';
	import Ft from './pop.svelte';
	import Ru from './rules.svelte';
	import { watch, hasFwRuleFilter } from '$lib/utils';
	import { fwRespLs, small } from '$lib/store';
	import { method } from '$lib/enum';

	let view = $state(0);
	let sty = $state();
	let pop = $state();
	let sel = $state(new Set());
	let tab = $state(0);
	let ls = $state([]);
	let lastL = $state(0);
	let loop = $state(0);
	const size = 10;
	let p = $state(1);
	let total = $state();
	let ld = $state(false);
	let filter = $state({});
	const lsWatch = watch(tab, p, filter);
	run(() => {
		sty = $small ? `transform:translate3d(${(-view * 100) / 2}%,0,0)` : '';
		lsWatch(
			() => {
				lastL = 0;
				ls = [];
			},
			tab,
			p,
			filter
		);
	});

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
				const k = a[0] + a[1] + a[2];
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
		req('fwRsp', undefined, { method: method.GET }).then((a) => {
			fwRespLs.set(a);
		});
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
			const s = new Set(['mark', 'ip', 'path', 'method', 'headers', 'country', 'status']);
			Object.keys(d).forEach((a) => {
				if (!s.has(a) || d[a] === '' || d[a] === undefined) delete d[a];
			});
			filter = { ...d };
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
					<s></s>
					<div class="tb" class:ac={tab}>
						<button onclick={tabCk(0)}>real-time</button>
						<button onclick={tabCk(1)}>firewall</button>
						<button class="i"></button>
					</div>
					<Ck name="auto" bind:value={loop} />
					<button onclick={() => loadLog()} class="icon i-refresh"></button>
					<button class="icon i-filter" class:act={hasFwRuleFilter(filter)} onclick={search}
					></button>
					<button class="icon i-set" onclick={() => (view = 1)}></button>
				</div>
			</div>
			<div class="e">
				<div class="b">
					{#each ls as d (d[0] + d[1] + d[2] + tab)}
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
	@use '../../../lib/break' as *;

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
		background: var(--bg6);
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
		display: flex;
		height: 30px;
		align-items: center;
		background: var(--bg0);
    @include s(){
     margin-right: 8px;
    }
		button {
			margin: 0;
			height: inherit;
			padding: 0;
			cursor: pointer;
			transition: 0.1s ease-in-out;
			font-size: 12px;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100px;
			line-height: 1;
			color: #8aa4af;
			z-index: 3;
      &:not(.i){
        background: none;
      }
		}
    .i {
			z-index: 0;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 50%;
      transition: 0.1s ease-in-out;
    }
	}

	.ac {
		.i {
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
		padding: 0 30px;

		@include s() {
			display: none;
		}
	}

	.h {
		height: 88px;
		align-items: center;
		background: var(--bg2);
		display: flex;
		width: 100%;
    @include s(){
      height: 60px;
			padding: 0 20px;
			button{
				margin: 0;
				width: 80px;
			}
    }
		s {
			flex: 1;
		}
	}

	.d {
		flex-wrap: wrap;
		display: flex;
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

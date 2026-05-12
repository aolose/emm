<script>
	import Card from './Card.svelte';
	import Ld from '$lib/components/loading.svelte';
	import { onMount } from 'svelte';
	import { delay, watch } from '$lib/utils';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';

	let type = $state();
	let start = $state();
	let t = $state(0);
	let ld = $state(0);
	const d = 3600 * 1e3 * 24;
	const n = [1, 3, 7, 30, 90];
	const wt = watch(-1);
	let cvs = $state();
	let ctx;
	let pv = $state([]);
	let uv = $state([]);
	let ur = $state([]);
	let rv = $state([]);
	let nx = $state([]);
	let h = $state();
	let w = $state();
	let data = $derived([pv, uv, ur, rv]);
	let avg = $derived(data.map(a => {
		if (!a.length) return 0;
		return Math.ceil(a.reduce((x, y) => x + y, 0) / a.length);
	}));
	let total = $derived(data.map(a => a.reduce((x, y) => x + y, 0)));
	const genStep = (arr, n) => {
		const l = arr.length;
		if (l <= n) return arr;
		const step = (l - 1) / (n - 1);
		const v = [];
		for (let i = 0; i < n; i++) {
			v.push(arr[Math.min(Math.round(i * step), l - 1)]);
		}
		const dedup = [v[0]];
		for (let i = 1; i < v.length; i++) {
			if (v[i] !== dedup[dedup.length - 1]) dedup.push(v[i]);
		}
		return dedup;
	};
	const hexToRgba = (hex, alpha) => {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	};
	const ck = $state({ 0: 1, 1: 1, 2: 0, 3: 0 });
	const cors = ['#8c72ce', '#d3a84b', '#65b9e7', '#bcff94'];
	const nms = ['valid requests', 'valid ip', 'ip', 'requests'];
	const getD = () => {
		const ds = n[t];
		let end = Date.now();
		let start = end - d * ds;
		const x = 3600 * 1000 * (type ? 24 : 1);
		start = Math.floor(start / x);
		end = Math.floor(end / x);
		const time = (a) => {
			const z = new Date(a * x);
			const m = z.getMonth() + 1;
			const d = z.getDate();
			const h = z.getHours();
			if (type) return `${d}/${m}`;
			else return h;
		};
		ld = 1;
		req('puv', { s: start, e: end, t: type }, { method: method.GET, delay: 300 })
			.then((a) => {
				const p = [];
				const u = [];
				const r = [];
				const i = [];
				const x = [];
				if (a.length === 1) a = a.concat(a);
				a.forEach((o) => {
					u.push(o.u);
					r.push(o.r);
					p.push(o.p);
					i.push(o.ur);
					x.push(o.t);
				});
				nx = genStep(x, 7).map(time);
				pv = p;
				uv = u;
				ur = i;
				rv = r;
			})
			.finally(() => (ld = 0));
	};
	const line = (color, w, h, ys, ...d) => {
		if (!d.length) return;
		const dmin = Math.min(...d);
		const dmax = Math.max(...d);
		const sy = 20;
		const sx = 65;
		const ry = (h - 40) / (dmax - dmin || 1);
		const fy = (a) => h - sy - (a - dmin) * ry;
		const step = (w - sx - 10) / (d.length - 1);
		const pts = d.map((a, i) => ({ x: sx + step * i, y: fy(a) }));
		const baseline = h - sy;

		// gradient fill below line
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(pts[0].x, baseline);
		for (const pt of pts) ctx.lineTo(pt.x, pt.y);
		ctx.lineTo(pts[pts.length - 1].x, baseline);
		ctx.closePath();
		const grad = ctx.createLinearGradient(0, sy, 0, baseline);
		grad.addColorStop(0, hexToRgba(color, 0.1));
		grad.addColorStop(1, hexToRgba(color, 0.0));
		ctx.fillStyle = grad;
		ctx.fill();
		ctx.restore();

		// stroke line
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		pts.forEach((pt, i) => {
			if (i === 0) ctx.moveTo(pt.x, pt.y);
			else ctx.lineTo(pt.x, pt.y);
		});
		ctx.stroke();

		// Y-axis labels for this line on the left edge
		if (ys) {
			ctx.fillStyle = color;
			ctx.font = '11px sans-serif';
			ctx.textAlign = 'right';
			const labels = [];
			const lblStep = Math.max((dmax - dmin) / 6, 1);
			for (let v = Math.ceil(dmin); v <= dmax; v += lblStep) {
				labels.push(v);
			}
			if (!labels.includes(dmax)) labels.push(dmax);
			for (const v of labels) {
				const y = fy(v);
		ctx.fillText(String(Math.round(v)), 50, y + 4);
			}
		}
	};
	const draw = delay(() => {
		if (!cvs) return;
		ctx = cvs.getContext('2d');
		const [w, h] = [cvs.width, cvs.height];
		ctx.clearRect(0, 0, w, h);
		// find first checked line to show its Y labels
		let firstIdx = -1;
		for (let i = 0; i < 4; i++) {
			if (ck[i] && data[i].length) { firstIdx = i; break; }
		}
		data.forEach((a, i) => {
			if (ck[i] && a.length) {
				line(cors[i], w, h - 20, i === firstIdx, ...a);
			}
		});
	}, 100);
	const render = draw;

	$effect(() => {
		// fetch on t change
		t;
		type = +!!t;
		start = Date.now() - (t + 1) * d;
		if (cvs) {
			wt(getD, t);
		}
	});
	$effect(() => {
		// re-render when data or toggle changes
		const _d = data.map(a => a.slice());
		const _c = { ...ck };
		void _d;
		void _c;
		render();
	});
	onMount(render);
</script>

<Card title="Statistics">
	{#snippet btn()}
		<button class="icon i-refresh" onclick={getD}></button>
	{/snippet}
	<div class="v">
		<div class="bn">
			<span>last: </span>
			{#each n as a, index}
				<button onclick={() => (t = index)} class:act={index === t}>{a}D</button>
			{/each}
		</div>
		<div class="a">
			<div class="c" style="width:100%">
				<div bind:offsetWidth={w} bind:offsetHeight={h} class="e">
					<canvas bind:this={cvs} height={h} width={w + 55}></canvas>
				</div>
				<div class="x">
					{#each nx as x}
						<span>{x}</span>
					{/each}
				</div>
			</div>
		</div>
		<div class="i">
			{#each nms as n, index}
				<button class:act={ck[index]} onclick={() => (ck[index] = 1 - ck[index])}>
					<span>{n}</span>
					<span>{avg[index] || 0} / {type ? 'd' : 'h'} total: {total[index] || 0}</span>
					<b style={`color:${cors[index]}`}></b>
				</button>
			{/each}
		</div>
		<Ld act={ld} />
	</div>
</Card>
<svelte:window onresize={render} />

<style lang="scss">
	.bn {
		padding: 0 20px;
		margin-bottom: 20px;
		display: flex;
		align-items: center;

		button {
			min-width: 0;
			padding: 8px;
		}
	}

	button {
		flex: 1;
		font-size: 12px;
		margin: 0 5px;
		opacity: 0.5;
	}

	.icon {
		flex: none;
		cursor: pointer;
		opacity: 1;
		padding: 3px;
		right: -10px;
		background: none;

		&:hover {
			color: #fff;
		}
	}

	.act {
		opacity: 1;
		color: #fff;
	}

	.i {
		margin-top: 10px;
		display: grid;
		justify-content: end;
		grid-template-columns: repeat(auto-fill, 300px);

		span {
			color: rgba(130, 140, 180, 1);
			display: block;
			padding: 0 3px;
			font-size: 13px;
			white-space: nowrap;
		}

		button {
			flex-shrink: 0;
			opacity: 0.5;
			padding: 0;
			margin-bottom: 3px;
			justify-content: flex-end;
			align-items: center;
			font-size: 13px;
			display: inline-flex;
			background: none !important;
		}

		.act {
			opacity: 1;
		}

		b {
			margin-left: 10px;
			height: 10px;
			width: 10px;
			background: currentColor;
			display: block;
		}
	}

	.v {
		display: flex;
		flex-direction: column;
		min-height: 360px;
		flex-grow: 1;
		width: 100%;
		padding: 0 30px 0 20px;
	}

	.a {
		flex-grow: 1;
		display: flex;

		span {
			display: block;
		}
	}

	.y {
		top: -1em;
		text-align: right;
		font-size: 12px;
		display: flex;
		flex-direction: column-reverse;
		justify-content: space-between;
		padding: 20px 5px;
	}

	.x {
		display: flex;
		padding: 0 10px;
		justify-content: space-between;

		span {
			flex: 1;
			text-align: center;
		}

		span:first-child {
			flex: 0;
			transform: translateX(-50%);
		}

		span:last-child {
			flex: 0;
			transform: translateX(50%);
		}
	}

	.c {
		width: 0;
		min-height: 300px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	.e {
		flex-grow: 1;
		position: relative;
		overflow: visible;
		border-left: 1px solid #6c7a93;
		border-bottom: 1px solid #6c7a93;
		background:
			linear-gradient(0deg, rgba(100, 100, 100, 0.5) 0, transparent 1px),
			linear-gradient(90deg, rgba(100, 100, 100, 0.5) 0, transparent 1px) 10px 10px;
		background-size: 20px 20px;
	}

	canvas {
		position: absolute;
		top: 0;
		left: -55px;
	}

	.i-refresh {
		color: transparent;
		background: linear-gradient(142deg, rgb(83, 136, 172), rgb(87, 71, 204));
		background-clip: text;
		font-size: 16px;
		min-width: 0 !important;
	}
</style>
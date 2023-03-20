<script>
	import Card from './Card.svelte';
	import Ld from '$lib/components/loading.svelte';
	import { onMount } from 'svelte';
	import { delay, watch } from '$lib/utils';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';

	let type;
	let start;
	let t = 0;
	let ld = 0;
	const d = 3600 * 1e3 * 24;
	const n = [1, 3, 7, 30, 90];
	const wt = watch(-1);
	let cvs;
	let ctx;
	let pv = [];
	let uv = [];
	let ur = [];
	let rv = [];
	let nx = [];
	let ny = [];
	let pre = [];
	let total = [];
	let h;
	let w;
	let max = 0,
		min = 0;
	let data = [];
	const genStep = (arr, n) => {
		const l = arr.length;
		if (l <= n) return arr;
		const s = arr[0];
		const e = arr[l - 1];
		const v = [];
		const step = l / (n - 2);
		for (let i = s + step; i < e; i += step) {
			const z = Math.floor(i);
			if (z <= s || v.includes(z)) continue;
			v.push(z);
		}
		return [s, ...v, e];
	};

	const cors = ['#8c72ce', '#d3a84b', '#65b9e7', '#bcff94'];
	const nms = ['valid requests', 'valid ip', 'all ip', 'all requests'];
	const getD = () => {
		const ds = n[t];
		let end = Date.now();
		let start = end - d * ds;
		const x = 3600 * 1000;
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
	const line = (color, w, h, max, min, ...d) => {
		ctx.strokeStyle = ctx.fillStyle = color;
		const ry = (h - 40) / (max - min);
		const sy = 20;
		const sx = 20;
		const step = (w - sx * 2) / (d.length - 1);
		const fy = (a) => h - sy - (a - min) * ry;
		ctx.beginPath();
		let px, py;
		d.forEach((a, i) => {
			const my = fy(a);
			const mx = sx + step * i;
			if (!i) {
				ctx.moveTo(mx, my);
				ctx.arc(mx, my, 2, 0, 2 * Math.PI);
				ctx.fill();
			} else {
				ctx.moveTo(mx, my);
				ctx.arc(mx, my, 2, 0, 2 * Math.PI);
				ctx.fill();
				ctx.moveTo(px, py);
				ctx.lineTo(mx, my);
				ctx.stroke();
			}
			px = mx;
			py = my;
		});
	};
	const draw = delay(() => {
		if (!cvs) return;
		ctx = cvs.getContext('2d');
		const [w, h] = [cvs.width, cvs.height];
		ctx.clearRect(0, 0, w, h);
		data.forEach((a, i) => line(cors[i], w, h - 20, max, min, ...a));
	}, 100);
	const render = async () => {
		const nny = [];
		const step = Math.max((max - min) / 10, 1);
		for (let m = min; m < max - step; m += step) {
			nny.push(Math.floor(m));
		}
		nny.push(max);
		if (JSON.stringify(nny) !== JSON.stringify(ny)) ny = nny;
		pre.length = 0;
		total.length = 0;
		data.forEach((a, i) => {
			const t = a.reduce((a, b) => a + b, 0);
			const p = Math.floor(t / a.length);
			pre[i] = p;
			total[i] = t;
		});
		pre = [...pre];
		total = [...total];
		draw();
	};

	$: {
		data = [pv, uv, ur, rv];
		min = uv.length ? Math.min(...uv) : 0;
		max = rv.length ? Math.max(...rv) : 0;
		const n = Date.now();
		type = +!!t;
		start = n - (t + 1) * d;
		render();
		if (cvs) {
			wt(getD, t);
		}
	}
	onMount(render);
</script>

<Card title="Analytics">
	<button class="icon i-refresh" slot="btn" on:click={getD} />
	<div class="v">
		<div class="bn">
			<span>last: </span>
			{#each n as a, index}
				<button on:click={() => (t = index)} class:act={index === t}>{a}D</button>
			{/each}
		</div>
		<div class="a">
			<div class="y" style={`height:${h}px`}>
				{#each ny as y}
					<span>{y}</span>
				{/each}
			</div>
			<div class="c">
				<div bind:offsetWidth={w} bind:offsetHeight={h} class="e">
					<canvas bind:this={cvs} height={h} width={w} />
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
				<div>
					<span>{n}</span>
					<span>{pre[index] || 0} / {type ? 'd' : 'h'} total: {total[index] || 0}</span>
					<b style={`color:${cors[index]}`} />
				</div>
			{/each}
		</div>
		<Ld act={ld} />
	</div>
</Card>
<svelte:window on:resize={getD} />

<style lang="scss">
	.bn {
		padding: 0 20px;
		margin-bottom: 20px;
	}

	button {
		border-radius: 3px;
		font-size: 12px;
		padding: 1px 8px;
		margin: 0 5px;
		opacity: 0.5;
		background: var(--darkgrey);
	}

	.icon {
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
		background: #3767b9;
		color: #fff;
	}

	.i {
		margin-top: 10px;

		span {
			display: block;
			padding: 0 3px;
			font-size: 13px;
		}

		div {
			margin-bottom: 3px;
			justify-content: flex-end;
			align-items: center;
			font-size: 13px;
			display: flex;
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
		padding: 0 20px;
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
	}

	canvas {
		position: absolute;
		background: linear-gradient(0deg, rgba(100, 100, 100, 0.5) 0, transparent 1px),
			linear-gradient(90deg, rgba(100, 100, 100, 0.5) 0, transparent 1px) 18px 10px;
		background-size: 20px 20px;
		border: 1px solid #6c7a93;
		border-top: 0;
		border-right: 0;
		top: 0;
		left: 0;
	}
</style>

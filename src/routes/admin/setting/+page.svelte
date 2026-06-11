<script>
	import G from './geo.svelte';
	import B from './blog.svelte';
	import A from './acc.svelte';
	import T from './about.svelte';
	import C from './backup.svelte';
	import R from './res.svelte';
	import P from './puv.svelte';
	import Ts from './turnstile.svelte';
	import Cf from './cloudflare.svelte';
	import Fw from './firewall.svelte';
	import Ai from './ai.svelte';
	import R2 from './r2.svelte';
	import { onMount } from 'svelte';
	import { load } from './sys';

	onMount(load);

	// 1. 定义组件和它们的“预估高度”（数值代表相对长短，填错也不影响正常渲染）
	const componentList = [
		{ comp: P, height: 512 },
		{ comp: Ai, height: 726 }, // 假设 AI 卡片比较长
		{ comp: R2, height: 548 },
		{ comp: Ts, height: 180 },
		{ comp: Cf, height: 422 },
		{ comp: C, height: 220 },
		{ comp: B, height: 970 }, // 假设博客卡片很长
		{ comp: T, height: 70 },
		{ comp: A, height: 374 },
		{ comp: R, height: 280 },
		{ comp: G, height: 190 },
		{ comp: Fw, height: 200 }
	];

	let innerWidth = 0;
	let columnsCount = 3;

	// 2. 根据屏幕宽度，动态计算列数
	$: {
		if (innerWidth < 800) {
			columnsCount = 1;
		} else if (innerWidth < 1400) {
			columnsCount = 2;
		} else {
			columnsCount = 3;
		}
	}

	// 3. 核心平衡算法：贪心算法分列
	let columns = [];
	$: {
		// 初始化每一列的空数组，以及每一列的初始累加高度
		columns = Array.from({ length: columnsCount }, () => []);
		let columnHeights = Array(columnsCount).fill(0);

		componentList.forEach((item) => {
			// 寻找当前总高度最短的那一列的索引
			let shortestColumnIndex = 0;
			let minHeight = columnHeights[0];

			for (let i = 1; i < columnsCount; i++) {
				if (columnHeights[i] < minHeight) {
					minHeight = columnHeights[i];
					shortestColumnIndex = i;
				}
			}

			// 把当前组件塞入最短的那一列
			columns[shortestColumnIndex].push(item.comp);
			// 累加该列的高度（加上 gap 权重 12，模拟真实空间占用）
			columnHeights[shortestColumnIndex] += item.height + 12;
		});
	}
</script>

<svelte:window bind:innerWidth />

<div class="m">
	<div class="w">
		{#each columns as column}
			<div class="waterfall-col">
				{#each column as Component}
					<div class="card-item">
						<svelte:component this={Component} />
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	.w {
		display: flex;
		align-items: flex-start; /* 极其重要：防止列与列之间互相强行拉伸 */
		margin: 0;
		width: 100%;
		@include s() {
			padding: 10px 0;
		}
	}

	.waterfall-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px; /* 每一个卡片之间完美的、绝对一致的纵向间距 */
		align-items: flex-start; /* 极其重要：确保里面的卡片各自保持原本高度，决不纵向拉伸 */
		min-width: 0; /* 规避某些弹性布局下的溢出边缘常态 bug */
		@include s() {
			gap: 0;
		}
	}

	.card-item {
		width: 100%;
		height: auto; /* 内部组件撑开多少就是多少 */
		display: block;
	}

	.m {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		overflow: auto;
		padding: 12px;
		@include s() {
			padding: 0;
		}
	}
</style>

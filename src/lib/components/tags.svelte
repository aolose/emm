<script>
	import { tick } from 'svelte';
	// 移除 slide 动画，下拉列表用 CSS 或者直接显示会流畅很多
	import { idGen } from '$lib/utils';
	import { SvelteSet } from 'svelte/reactivity';
	let { tags = [], value = $bindable() } = $props();
	let items = $state(new Set(value ? value?.split(',').filter((a) => !!a) : []));
	let val = $state('');
	let ipt = $state();
	let show = $state(0);

	const add = (v) => {
		v = v.trim();
		if (v && !items.has(v)) {
			items.add(v);
			items = new SvelteSet(items);
		}
	};

	const rm = (v) => () => {
		items.delete(v);
		items = new SvelteSet(items);
	};

	const keyPress = (e) => {
		const { code } = e;
		const s = ipt.selectionStart;
		if (code.startsWith('Arrow')) {
			switch (code[5]) {
				case 'R':
					if (s === val.length) return (val = pre);
					break;
				case 'U':
					e.preventDefault(); // 阻止光标移动
					return idx--;
				case 'D':
					e.preventDefault(); // 阻止光标移动
					return idx++;
			}
		}
		if (code === 'Enter') {
			e.preventDefault();
			const word = (pre || val).trim();
			if (word) add(word);
			val = '';
		} else if (code === 'Backspace') {
			if (!s) {
				const arr = [...items];
				const last = arr[arr.length - 1];
				if (last) {
					items.delete(last);
					items = new SvelteSet(items);
				}
			}
		}
	};

	const onInput = () => {
		const sepIdx = /[,;\t\n\r]/.exec(val);
		if (sepIdx) {
			const word = val.slice(0, sepIdx.index).trim();
			if (word) add(word);
			val = val.slice(sepIdx.index + 1);
		}
	};

	let id = idGen();
	let dp = $state();
	let idx = $state(0);

	// 过滤并排序列表
	let selects = $derived(
		(Array.isArray(tags) ? tags : [])
			.filter((a) => !items.has(a) && a !== val && a.toLowerCase().startsWith(val.toLowerCase()))
			.sort((a, b) => (a < b ? -1 : 1))
	);

	// 当列表长度变化时，重置高亮索引，防止数组越界
	$effect(() => {
		if (idx >= selects.length) idx = 0;
		if (idx < 0) idx = Math.max(0, selects.length - 1);
	});

	$effect(() => {
		if (dp && idx !== undefined) {
			tick().then(() => {
				const activeEl = dp.querySelector('.act');
				activeEl?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
			});
		}
	});

	// 同步数据回父组件
	$effect(() => {
		value = [...items].join() || null;
	});

	let pre = $derived(show || val ? selects[idx] || val : '');

	const selectTag = (sec) => {
		add(sec);
		val = '';
		// 延迟聚焦，防止和 blur 事件冲突
		setTimeout(() => ipt?.focus(), 0);
	};
</script>

<label class="a" for={id}>
	{#if selects.length && (show || val)}
		<!-- 移除了这里的 transition:slide|global -->
		<div class="d" bind:this={dp}>
			<!-- 加上 (sec) 作为唯一标识 key，加快渲染速度 -->
			{#each selects as sec, index (sec)}
				<div class:act={idx === index} onclick={() => selectTag(sec)}>{sec}</div>
			{/each}
		</div>
	{/if}
	{#each [...items] as item (item)}
		<div class="b">
			<span>{item}</span>
			<button class="icon i-close" onclick={rm(item)}></button>
		</div>
	{/each}
	<div class="c">
		<span>{val}</span>
		<span>{pre.replace(val, '')}</span>
		<input
			autocomplete="off"
			{id}
			bind:value={val}
			bind:this={ipt}
			onfocus={() => (show = 1)}
			onblur={() => setTimeout(() => (show = 0), 200)}
			onkeydown={keyPress}
			oninput={onInput}
		/>
	</div>
</label>

<style lang="scss">
	span {
		font-size: 13px;
		color: currentColor;
	}

	.a {
		display: flex;
		flex-wrap: wrap;
		min-height: 30px;
		position: relative; /* 确保定位正确 */
	}

	.d {
		transform: translateY(-15px);
		bottom: 100%;
		padding: 10px 0;
		background: rgba(21, 23, 26, 0.9); /* 稍微提高不透明度 */
		position: absolute;
		left: -10px;
		right: -10px;
		max-height: 100px;
		overflow-y: auto; /* 明确只在 Y 轴滚动 */
		z-index: 10; /* 防止被其他标签遮挡 */

		div {
			color: #60799f;
			/* 移除了 transition: 0.2s 动画，列表大时文字变色动画会导致卡顿 */
			padding: 3px 20px;
			cursor: pointer;

			&:hover {
				background: rgba(0, 0, 0, 0.1);
			}
		}

		.act {
			color: #d0c791;
			background: rgba(0, 0, 0, 0.2);
		}
	}

	.b {
		background: #20263c;
		align-self: flex-start;

		span {
			padding: 5px 10px;
		}
	}

	button {
		padding: 5px;
		border-left: 1px solid #171b2a;
		color: #627184;
		cursor: pointer;

		&:hover {
			color: #8aa3ab;
		}
	}

	.b,
	.c {
		height: 28px;
		display: flex;
		align-items: center;
		margin: 2px 3px;
	}

	.c {
		flex: 1;
		min-width: 80px;
		line-height: 18px;
		white-space: nowrap;
		margin-left: 10px;
		position: relative; /* 确保子元素 input 定位准确 */

		input,
		span {
			margin: 0;
			padding: 5px 0;
			background: none;
			border: none;
			min-height: 0;
			line-height: inherit;
			outline: none;
			font-size: 15px;
		}

		input {
			min-width: 0;
			width: 100%;
			color: #b5c8ea;
			position: absolute;
			left: 0;
			top: 0;
		}

		span {
			margin-left: 0.5px;
			opacity: 0;
			color: #446188;
		}

		span + span {
			opacity: 1;
		}
	}
</style>

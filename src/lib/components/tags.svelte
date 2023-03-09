<script>
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { idGen } from '$lib/utils';

	export let tags = [];
	$: allTags = new Set(tags);
	export let value = null;
	let items = new Set(value ? value?.split(',').filter((a) => !!a) : []);
	let val = '';
	let ipt;
	let show = 0;
	const rm = (v) => () => {
		items.delete(v);
		items = new Set(items);
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
					return idx--;
				case 'D':
					return idx++;
			}
		}

		if (code === 'Backquote') {
			e.preventDefault();
			show = 1 - show;
		}
		if (code === 'Enter') {
			val = val.slice(0, s) + ',' + val.slice(s);
		} else if (code === 'Backspace') {
			if (!s) {
				const siz = [...items][items.size - 1];
				if (siz) {
					items.delete(siz);
					items = new Set(items);
				}
			}
		}
	};
	let id = idGen();
	let dp;
	let idx = 0;
	let selects = [];
	$: pre = show || val ? selects[idx] || val : '';
	$: (async () => {
		selects = [...allTags].filter(
			(a) => !items.has(a) && val !== a && a.toLowerCase().startsWith(val.toLowerCase())
		);
		selects.sort((a, b) => (a < b ? -1 : 1));
		const lh = selects.length;
		idx = lh && idx % lh;
		const l = val.length;
		let s = 0;
		let h = 0;
		for (let i = 0; i < l; ) {
			const r = /^[ ,;\t\n\r]+/g;
			if (r.test(val.substring(i))) {
				if (s < i) {
					items.add(val.slice(s, i));
					h = 1;
				}
				i += r.lastIndex;
				s = i;
			} else i++;
		}
		val = val.substring(s);
		if (h) {
			items = new Set(items);
			await tick();
			ipt.setSelectionRange(0, 0);
		}
		if (dp) {
			await tick();
			const a = dp.querySelector('.act');
			a?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
		value = [...items].join() || null;
	})();
</script>

<label class="a" for={id}>
	{#if selects.length && (show || val)}
		<div class="d" bind:this={dp} transition:slide>
			{#each selects as sec, index}
				<div class:act={idx === index} on:click={() => (val = sec)}>{sec}</div>
			{/each}
		</div>
	{/if}
	{#each [...items] as item}
		<div class="b">
			<span>{item}</span>
			<button class="icon i-close" on:click={rm(item)} />
		</div>
	{/each}
	<div class="c">
		<span>{val}</span>
		<span>{pre.replace(val, '')}</span>
		<input
			{id}
			bind:value={val}
			bind:this={ipt}
			on:blur={() => setTimeout(() => (show = 0), 100)}
			on:keydown={keyPress}
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
	}

	.d {
		transform: translateY(-15px);
		bottom: 100%;
		padding: 10px 0;
		background: rgba(21, 23, 26, 0.7);
		position: absolute;
		left: -10px;
		right: -10px;
		max-height: 100px;
		overflow: auto;

		div {
			color: #60799f;
			transition: 0.2s ease-in-out;
			padding: 3px 20px;

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

		span {
			padding: 5px 10px;
		}
	}

	button {
		padding: 5px;
		border-left: 1px solid #171b2a;
		color: #627184;
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

		input,
		span {
			margin: 0;
			padding: 5px 0;
			background: none;
			border: none;
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

	.d {
	}
</style>

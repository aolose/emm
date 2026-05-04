<script>
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { idGen } from '$lib/utils';
	let { tags = [], value = $bindable() } = $props();
	let items = $state(new Set(value ? value?.split(',').filter((a) => !!a) : []));
	let val = $state('');
	let ipt = $state();
	let show = $state(0);
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
		if (code === 'Enter') {
			val = (pre || val.slice(0, s)) + ',' + val.slice(s);
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
	let dp = $state();
	let idx = $state(0);
	let allTags = $derived(new Set(tags));

	// Derived: filtered suggestions (was incorrectly written as state in $effect)
	let selects = $derived(
		[...allTags]
			.filter((a) => !items.has(a) && val !== a && a.toLowerCase().startsWith(val.toLowerCase()))
			.sort((a, b) => (a < b ? -1 : 1))
	);

	// Effect: parse val for separators and add to items
	$effect(() => {
		const v = val;
		const l = v.length;
		let s = 0;
		let h = 0;
		for (let i = 0; i < l; ) {
			const r = /^[ ,;\t\n\r]+/g;
			if (r.test(v.substring(i))) {
				if (s < i) {
					items.add(v.slice(s, i));
					h = 1;
				}
				i += r.lastIndex;
				s = i;
			} else i++;
		}
		if (h) {
			items = new Set(items);
			// Defer val reset to avoid synchronous write-back loop
			tick().then(() => {
				val = v.substring(s);
				ipt?.setSelectionRange(0, 0);
			});
		}
	});

	// Effect: clamp idx when selects change, and scroll active item into view
	$effect(() => {
		const lh = selects.length;
		if (idx >= lh) idx = 0;

		if (dp) {
			tick().then(() => {
				const a = dp.querySelector('.act');
				a?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
		}
	});

	// Effect: sync selected items back to parent via bindable value
	$effect(() => {
		value = [...items].join() || null;
	});

	let pre = $derived(show || val ? selects[idx] || val : '');
</script>

<label class="a" for={id}>
	{#if selects.length && (show || val)}
		<div class="d" bind:this={dp} transition:slide|global>
			{#each selects as sec, index}
				<div class:act={idx === index} onclick={() => (val = sec)}>{sec}</div>
			{/each}
		</div>
	{/if}
	{#each [...items] as item}
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
			onblur={() => (show = 0)}
			onkeydown={keyPress}
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
		align-self: flex-start;

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

	.d {
	}
</style>

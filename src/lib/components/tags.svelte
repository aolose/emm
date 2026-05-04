<script>
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { idGen } from '$lib/utils';
	let { tags = [], value = $bindable() } = $props();
	let items = $state(new Set(value ? value?.split(',').filter((a) => !!a) : []));
	let val = $state('');
	let ipt = $state();
	let show = $state(0);

	const add = (v) => {
		v = v.trim();
		if (v && !items.has(v)) {
			items.add(v);
			items = new Set(items);
		}
	};

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
					items = new Set(items);
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

	let selects = $derived(
		(Array.isArray(tags) ? tags : [])
			.filter((a) => !items.has(a) && a !== val && a.toLowerCase().startsWith(val.toLowerCase()))
			.sort((a, b) => (a < b ? -1 : 1))
	);

	// Clamp idx and scroll active item into view
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

	// Sync selected items back to parent via bindable value
	$effect(() => {
		value = [...items].join() || null;
	});

	let pre = $derived(show || val ? selects[idx] || val : '');

	const selectTag = (sec) => {
		add(sec);
		val = '';
		ipt?.focus();
	};
</script>

<label class="a" for={id}>
	{#if selects.length && (show || val)}
		<div class="d" bind:this={dp} transition:slide|global>
			{#each selects as sec, index}
				<div class:act={idx === index} onclick={() => selectTag(sec)}>{sec}</div>
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
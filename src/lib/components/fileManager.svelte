<!-- @migration-task Error while migrating Svelte code: can't migrate `let cfg = {};` to `$state` because there's a variable named status.
     Rename the variable and try again or migrate by hand. -->
<script>
	import Pg from './pg.svelte';
	import Item from './fItems.svelte';
	import { confirm, fileManagerStore, filesUpload, getProgress, upFiles } from '$lib/store';
	import { api, req } from '$lib/req';
	import { onMount, tick } from 'svelte';
	import { get, writable } from 'svelte/store';
	import { slidLeft } from '../transition';
	import { fade, slide } from 'svelte/transition';
	import { delay, trim, watch } from '$lib/utils';

	const getRes = api('res');
	let total = $state(1);
	let status = $state(0);
	let cfg = $state({
		show: false,
		limit: 0
	});

	let ls = $state([]);
	let loading = false;
	let { w } = $props();
	const size = 15;
	const trigger = writable(0);

	function ok() {
		cfg.resolve?.([...selected]);
		fileManagerStore.set({});
		selected = new Set();
	}

	function cancel() {
		cfg.reject?.();
		fileManagerStore.set({});
		selected = new Set();
	}

	function load(page = 1) {
		loading = 1;
		const o = { page, size, type: cfg.type };
		if (sc) o.name = sc;
		getRes(o).then(({ total: t, items }) => {
			loading = 0;
			total = t;
			ls = items;
			const n = [...selected];
			items.forEach((f) => {
				const idx = n.findIndex((a) => a.id === f.id);
				if (idx !== -1) n[idx] = f;
			});
			selected = new Set(n);
			rePosition();
		});
	}

	const dLoad = delay(load, 300);

	let fs = [];
	upFiles.subscribe((f) => {
		fs = f.map((f) => [f.name, getProgress(f), f.abort]);
	});

	function upload(e) {
		status = 0;
		let files = e.type === 'drop' ? e.dataTransfer.files : e.target.files;
		const tp = cfg.type;
		if (tp && files?.length)
			files = [].filter.call(files, (f) => new RegExp(tp.replace(/[*]/g, '.*')).test(f.type));
		if (files?.length)
			filesUpload(files, (f) => {
				if (ls.find((a) => a.id === f.id)) return;
				ls = [f].concat(ls);
				rePosition();
			});
	}

	function rePosition() {
		tick().then(() => {
			trigger.update((a) => a + 1);
		});
	}

	function del() {
		const s = selected.size;
		confirm(`Are you sure to delete the selected file${s > 1 ? 's' : ''}?`)
			.then(() => {
				return req('res', [...selected].map((a) => a.id).join(), { method: 2 });
			})
			.then((a) => {
				if (a) {
					ls = ls.filter((a) => !selected.has(a));
					rePosition();
					selected = new Set();
				}
			});
	}

	onMount(() => {
		return fileManagerStore.subscribe((s) => {
			Object.assign(
				cfg,
				{
					show: false,
					limit: 0
				},
				s
			);
			if (s.show) load();
		});
	});
	let limit = $derived(cfg.limit);
	let selected = $state(new Set());
	let ss = $derived(`${selected.size}${limit ? ' / ' + limit : ''}`);

	const sel = (f) => () => {
		if (selected.has(f)) selected.delete(f);
		else {
			const n = [...selected];
			if (limit && limit === selected.size) {
				n.shift();
			}
			n.push(f);
			selected = new Set(n);
		}
		selected = new Set(selected);
	};
	const sty = `--w:${w}%`;
	let sc = $state('');
	const ws = watch(sc);
	$effect(() => {
		ws(() => {
			sc = trim(sc);
			dLoad(1);
		}, sc);
	});
</script>

{#if cfg.show}
	<div
		style={sty}
		transition:fade|global
		class="a"
		class:dr={status === 1}
		on:dragover|preventDefault={() => (status = 1)}
		on:drop|preventDefault={upload}
		on:dragleave|preventDefault={() => (status = 0)}
		on:dragend|preventDefault={() => (status = 0)}
		on:click={cancel}
	>
		<div class="dp" on:click|stopPropagation />
		<div class="b" on:click|stopPropagation>
			<div class="h">
				<div class="g">
					<button class="icon i-add" title="upload files">
						<input type="file" accept={cfg.type || '*/*'} on:change={upload} multiple />
					</button>
					{#if selected.size}
						<button transition:slidLeft class="icon i-ok" title="use selected" on:click={ok} />
						<button
							transition:slidLeft
							class="icon i-no"
							title="clear selected"
							on:click={() => (selected = new Set())}
						/>
						<button transition:slidLeft class="icon i-del" title="delete selected" on:click={del} />
						<span class="v">{ss}</span>
					{/if}
				</div>
				<s />
				<div class="s">
					<button class="icon i-search" />
					<input bind:value={sc} />
				</div>
				<button class="icon i-close" on:click={cancel} />
			</div>
			<div class="ls">
				{#each ls as file, index (file.id)}
					<Item
						bind:file={ls[index]}
						{trigger}
						act={selected.has(ls[index])}
						on:click={sel(ls[index])}
					/>
				{/each}
			</div>
			{#if $upFiles.length}
				<div class="u" transition:slide|global>
					{#each fs as u}
						<div class="r">
							<span title={u[0]}>{u[0]}</span>
							<div class="t">
								<div style:width={`${get(u[1])}%`} />
							</div>
							<button class="icon i-close" on:click={u[2]} />
						</div>
					{/each}
				</div>
			{/if}
			<div class="p">
				<Pg go={load} {total} />
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '../../lib/break' as *;

	.g {
		display: flex;
		align-items: center;
	}

	.v {
		white-space: nowrap;
		background: var(--bg0);
		font-size: 12px;
		padding: 0 5px;
		color: #707e94;
	}

	s {
		flex: 1;
	}

	.u {
		transition: 0.3s ease-in-out;
		border: 15px solid transparent;
		border-bottom: 0;
		display: flex;
		flex-wrap: wrap;
		align-content: center;
		height: 100px;
		overflow: auto;

		button {
			font-size: 12px;
			padding: 3px;
			cursor: pointer;
		}

		span {
			width: 100px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 13px;
		}

		.t {
			height: 4px;
			flex: 1;
			background: var(--darkgrey);

			div {
				transition: 0.1s linear;
				height: 100%;
				background: #3a596b;
			}
		}
	}

	.r {
		height: 30px;
		padding: 0 20px;
		display: flex;
		width: 50%;
		align-items: center;
	}

	[type='file'] {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		width: auto;
		opacity: 0;
		display: block;
		appearance: none;
	}

	.dp {
		pointer-events: none;
		position: absolute;
		left: 10px;
		top: 10px;
		right: 10px;
		bottom: 10px;
		border: 5px dashed #fff;
		border-radius: 10px;
		opacity: 0;
		transition: 0.2s;
	}

	.dr > .dp {
		opacity: 0.2;
	}

	.icon {
		background: var(--darkgrey);
		font-size: 18px;
		padding: 10px;
		border: none;
		color: #a2afc5;
		background: none;
		cursor: pointer;
		transition: 0.2s ease-in-out;

		&:hover {
			color: #fff;
		}
	}

	.i-close {
		margin-left: 10px;
	}

	input {
		background: none;
		width: 0;
		outline: none;
		flex: 1;
		height: inherit;
		border: 0;
		padding: 0;
	}

	.s {
		box-shadow: inset rgba(0, 0, 0, 0.1) 0 0 4px;
		border-radius: 4px;
		display: flex;
		width: 300px;
		padding: 0 10px;
		background: var(--bg1);
		align-items: center;

		button {
			padding-left: 0;
		}
	}

	.h {
		align-items: center;
		padding: 10px 10px;
		display: flex;
	}

	.a {
		z-index: 5;
		position: fixed;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(1px);
		display: flex;
		justify-content: center;
		align-items: center;
		@include s() {
			backdrop-filter: none;
		}
	}

	.b {
		border-radius: 16px;
		width: 600px;
		height: 600px;
		background: var(--bg0);
		display: flex;
		flex-direction: column;
		box-shadow: rgba(0, 0, 0, 0.5) 0 10px 50px;
		@include s() {
			width: var(--w);
			height: 100%;
			box-shadow: none;
		}
	}

	.ls {
		background: var(--bg1);
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		overflow: auto;
		padding: 10px;
		align-content: flex-start;
	}

	.p {
		display: flex;
		align-items: center;
		height: 50px;
		justify-content: center;
	}
</style>

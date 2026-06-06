<script>
	import Pg from './pg.svelte';
	import Item from './fItems.svelte';
	import { confirm, fileManagerStore, filesUpload, getProgress, upFiles, h } from '$lib/store';
	import { api, req } from '$lib/req';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { flip } from 'svelte/animate';
	import { slidLeft } from '../transition';
	import { fade, slide } from 'svelte/transition';
	import { delay, trim, watch } from '$lib/utils';

	const getRes = api('res');
	let total = $state(1);
	let dragStatus = $state(0);
	let cfg = $state({
		show: false,
		limit: 0,
		type: ''
	});

	let ls = $state([]);
	let loading = $state(false);
	let { w } = $props();
	const size = 15;

	function ok() {
		const domain = get(h).r2PublicDomain;
		for (const f of selected) {
			if (domain && f.r2Synced && f.r2Key) {
				f.url = `${domain}/${f.r2Key}`;
			}
		}
		cfg.resolve?.([...selected]);
		fileManagerStore.set({});
		selected = [];
	}

	function cancel() {
		cfg.reject?.();
		fileManagerStore.set({});
		selected = [];
	}

	function load(page = 1) {
		loading = true;
		ls = [];
		const o = { page, size, type: cfg.type };
		if (sc) o.name = sc;
		getRes(o).then(({ total: t, items }) => {
			loading = false;
			total = t;
			ls = items;
			selected = [];
		});
	}

	const dLoad = delay(load, 300);

	let fs = [];
	upFiles.subscribe((f) => {
		fs = f.map((f) => [f.name, getProgress(f), f.abort]);
	});

	function upload(e) {
		dragStatus = 0;
		let files = e.type === 'drop' ? e.dataTransfer.files : e.target.files;
		const tp = cfg.type;
		if (tp && files?.length)
			files = [].filter.call(files, (f) => new RegExp(tp.replace(/[*]/g, '.*')).test(f.type));
		if (files?.length)
			filesUpload(files, (f) => {
				if (ls.find((a) => a.id === f.id)) return;
				ls = [f].concat(ls);
			});
	}

	function del() {
		const s = selected.length;
		confirm(`Are you sure to delete the selected file${s > 1 ? 's' : ''}?`)
			.then(() => {
				return req('res', selected.map((a) => a.id).join(), { method: 2 });
			})
			.then((a) => {
				if (a) {
					ls = ls.filter((a) => !selected.includes(a));
					selected = [];
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
	let selected = $state([]);
	let ss = $derived(`${selected.length}${limit ? ' / ' + limit : ''}`);

	const sel = (f) => () => {
		const index = selected.indexOf(f);
		if (index > -1) {
			selected.splice(index, 1);
		} else {
			if (limit && selected.length === limit) {
				selected.shift();
			}
			selected.push(f);
		}
	};
	const sty = $derived(`--w:${w}%`);
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
		class:dr={dragStatus === 1}
		ondragover={(e) => {
			e.preventDefault();
			dragStatus = 1;
		}}
		ondrop={(e) => {
			e.preventDefault();
			upload(e);
		}}
		ondragleave={(e) => {
			e.preventDefault();
			dragStatus = 0;
		}}
		ondragend={(e) => {
			e.preventDefault();
			dragStatus = 0;
		}}
		onclick={cancel}
	>
		<div class="dp" onclick={(e) => e.stopPropagation()} />
		<div class="b" onclick={(e) => e.stopPropagation()}>
			<div class="h">
				<div class="g">
					<button class="icon i-add" title="upload files">
						<input type="file" accept={cfg.type || '*/*'} onchange={upload} multiple />
					</button>
					{#if selected.length}
						<button transition:slidLeft class="icon i-ok" title="use selected" onclick={ok} />
						<button
							transition:slidLeft
							class="icon i-no"
							title="clear selected"
							onclick={() => (selected = [])}
						/>
						<button transition:slidLeft class="icon i-del" title="delete selected" onclick={del} />
						<span class="v">{ss}</span>
					{/if}
				</div>
				<s />
				<div class="s">
					<button class="icon i-search" />
					<input bind:value={sc} />
				</div>
				<button class="icon i-close" onclick={cancel} />
			</div>
			<div class="ls">
				{#if !loading}
					{#key ls}
						{#each ls as file, index (file.id)}
							<div animate:flip={{ duration: 300 }} out:fade={{ duration: 150 }}>
								<Item bind:file={ls[index]} act={selected.includes(file)} onclick={sel(file)} />
							</div>
						{/each}
					{/key}
				{/if}
			</div>
			{#if $upFiles.length}
				<div class="u" transition:slide|global>
					{#each fs as u}
						<div class="r">
							<span title={u[0]}>{u[0]}</span>
							<div class="t">
								<div style:width={`${get(u[1])}%`} />
							</div>
							<button class="icon i-close" onclick={u[2]} />
						</div>
					{/each}
				</div>
			{/if}
			<div class="p">
				<Pg go={load} {total} {loading} />
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

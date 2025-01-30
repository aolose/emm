<script>
	import Select from '$lib/components/select.svelte';
	import { permission, pmsName } from '$lib/enum';
	import { slide } from 'svelte/transition';
	import Ld from '$lib/components/loading.svelte';
	import { slidLeft } from '$lib/transition';
	import List from '$lib/components/post/rList.svelte';
	import Se from '$lib/components/post/rSelect.svelte';
	import { req } from '$lib/req';
	import { confirm } from '$lib/store';
	import { fade } from 'svelte/transition';
	import DateInput from '$lib/components/date.svelte';
	import Ck from '$lib/components/check.svelte';
	import { trim } from '$lib/utils';
	import { onMount } from 'svelte';

	let { edit = $bindable() } = $props();
	let show = $state(0);
	let ok = $state();
	let cancel = $state();
	let t = $state(0);
	let d = $state({ _posts: [], _reqs: [] });
	let tk = $state({});
	let l = $state(0);
	let sec = $state();
	let fine = $state(0);
	let hasExp = $state(0);
	let editMod = $state(false);

	function save(d, type) {
		l = 1;
		if (type) {
			return req('genCode', tk).finally(() => (l = 0));
		} else {
			return req('require', d).finally(() => (l = 0));
		}
	}

	function ed() {
		sec(t ? d._reqs : d._posts).then((a) => {
			if (a) {
				if (t) d._reqs = a;
				else d._posts = a;
			}
		});
	}

	const pms = [
		[permission.Post, pmsName.Post],
		[permission.Read, pmsName.Read],
		[permission.Admin, pmsName.Admin]
	];
	onMount(() => {
		edit = (type, data) => {
			editMod = !!data;
			t = type;
			show = 1;
			d = { ...(data || {}) };
			hasExp = d.expire > 0;
			return new Promise((rs) => {
				ok = () => {
					const o = { ...d };
					if (!type) {
						if (o.type === permission.Post) o._postIds = (d._posts || []).map((a) => a.id).join();
						delete o._posts;
					}
					save(o, type)
						.then((o) => {
							if (o) {
								if (!type) {
									const [id, ca] = o.split(' ');
									d.id = id;
									d.createAt = +ca;
								} else {
									o._reqs = d._reqs;
								}
							}
							show = 0;
							rs(type ? o : d);
						})
						.catch((a) => {
							confirm(a.message || a.data, '', 'ok');
						});
				};
				cancel = () => {
					rs();
					show = 0;
				};
			});
		};
	});
	const key = () => `${t} ${JSON.stringify(d)}`;
	let a;
	$effect(() => {
		const k = key();
		if (k === a) return;
		a = k;
		if (t) {
			delete d._posts;
			const hasPer = /\d/.test(d.type);
			if (hasPer) d._reqs = d._reqs?.filter((a) => a.type === d.type) || [];
			fine = hasPer && d._reqs?.length;
			if (fine) {
				tk = {
					type: d.type,
					share: +d.share || 0,
					times: +d.times || -1,
					reqs: d._reqs.map((a) => a.id).join()
				};
				if (hasExp) tk.expire = d.expire;
			}
		} else {
			delete d._reqs;
			d.name = trim(d.name || '');
			fine = d.name && /\d+/g.test(d.type);
		}
		if (d && d.times) d.times = Math.min(Math.max(-1, Math.floor(d.times)), 999);
	});
</script>

{#if show}
	<div class="m" transition:fade|global>
		<div class="a">
			<div class="t">
				<span>{['permission', 'ticket'][t]}</span>
				<button class="icon i-close" onclick={cancel}></button>
			</div>
			<div class="b">
				{#if !t}
					<div class="r"><span>name</span><input bind:value={d.name} /></div>
				{/if}
				{#if !editMod || t}
					<div class="r">
						<span>type</span>
						<Select bind:value={d.type} items={pms} />
					</div>
				{/if}
				{#if (t && /\d/.test(d.type)) || d.type === permission.Post}
					<div class="r" transition:slide|global>
						<span>{t ? 'permission' : 'posts'}</span>
						{#if t}
							<Se type={t} bind:items={d._reqs} inline />
						{:else}
							<Se type={t} bind:items={d._posts} inline />
						{/if}
						<button class="icon i-ed" onclick={ed}></button>
					</div>
				{/if}
				{#if t}
					<div class="r">
						<span><Ck name="expire" bind:value={hasExp} /></span>
						{#if hasExp}
							<DateInput bind:value={d.expire} min={Date.now()} />
						{:else}
							<input value={-1} readonly />
						{/if}
					</div>
					<div class="r">
						<span>times</span>
						<input
							placeholder="-1"
							bind:value={d.times}
							type="number"
							step="1"
							min="-1"
							max="999"
						/>
					</div>
					{#if t}
						<div class="r rr">
							<span><Ck name="Show the ticket on tickets page" bind:value={d.share} /></span>
						</div>
					{/if}
				{/if}
			</div>
			<div class="n">
				{#if fine}
					<button transition:slidLeft|global onclick={ok}
						>{t && editMod ? 'create' : 'submit'}</button
					>
				{/if}
				<button onclick={cancel}>cancel</button>
			</div>
			<Ld act={l} />
			<List permission={d.type} type={t} bind:select={sec} />
		</div>
	</div>
{/if}

<style lang="scss">
	@use '../../../lib/break' as *;

	[type='number'] {
		height: 40px;

		&::-webkit-outer-spin-button,
		&::-webkit-inner-spin-button {
			-webkit-appearance: none;
			margin: 0;
		}
	}

	.i-ed {
		position: absolute;
		left: 100%;
		top: 7px;
		margin-left: 5px;
		padding: 5px;
		border: 1px solid #1c340a;
		border-radius: 4px;
		color: #52718f;
		background: var(--bg1);
		transition: 0.2s;

		&:hover {
			color: #869bb4;
		}
	}

	.m {
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		backdrop-filter: blur(2px);
		background: rgba(80, 100, 150, 0.1);
		@include s() {
			backdrop-filter: none;
		}
	}

	.a {
		border: 1px solid var(--bg7);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		width: 500px;
		max-width: 100%;
		height: 700px;
		max-height: 100%;
		background: var(--bg1);
		box-shadow: var(--bg3) 0 20px 50px -30px;
		@include s() {
			height: 100%;
			box-shadow: none;
			border-radius: 0;
		}
	}

	.b {
		overflow-y: auto;
		padding: 10px 0;
		flex: 1;
		background: var(--bg2);
	}

	.t {
		span {
			color: #5a6875;
		}

		button {
			opacity: 0.5;
			padding: 10px;
			right: -10px;
			transition: 0.2s;

			&:hover {
				opacity: 1;
			}
		}
	}

	.t,
	.n {
		padding: 0 20px;
		display: flex;
		height: 50px;
		align-items: center;
		justify-content: space-between;
	}

	.n {
		justify-content: center;
		height: 60px;

		button {
			color: var(--darkgrey-h);
			height: 30px;
			display: flex;
			margin: 0 10px;
			align-items: center;
			width: 100px;
			border-radius: 100px;
			justify-content: center;
			border: 1px solid currentColor;
			transition: 0.2s;

			&:hover {
				color: #566f85;
			}
		}
	}

	.r {
		display: flex;
		margin: 20px auto;
		width: 70%;

		&:global {
			.a {
				margin: 0;
			}

			i {
				top: 2px;
				background: var(--bg3);
				border: 1px solid rgba(140, 181, 236, 0.1);
			}
		}

		& > span {
			color: #455564;
			line-height: 40px;
			width: 90px;
			text-align: right;
			padding-right: 20px;
		}

		input {
			width: 0;
			flex-grow: 1;
			border: 1px solid rgba(140, 181, 236, 0.1);
			background: var(--bg3);
		}
	}

	.rr {
		span {
			text-align: left;
			width: 100%;
		}
	}
</style>

<script>
	import Ava from '$lib/components/post/ava.svelte';
	import { time } from '$lib/utils';
	import { slide } from 'svelte/transition';
	import Cm from './cm.svelte';
	import Pg from '$lib/components/pg.svelte';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { confirm } from '$lib/store';

	export let d = {};
	export let user = {};

	export let cur = {};
	export let topic;
	const own = d._own;
	const isAdm = d.isAdm;
	$: name = isAdm ? 'admin' : (own === 1 && user.name) || d._name;
	$: avatar = isAdm ? -1 : (own === 1 && user.avatar) || d._avatar;
	let page = 1;
	export let done;
	export let remove;

	function reply() {
		if (cur.reply === d.id) {
			cur.set({ reply: 0 });
		} else {
			cur.set({
				topic: topic || d.id,
				reply: d.id
			});
		}
	}

	function ok(a) {
		d._cms = {
			items: (d._cms?.items || []).concat(a),
			total: d.total || 1
		};
		cur.set({ reply: 0 });
	}

	function del(id) {
		return () => {
			confirm('sure to delete?').then((a) => {
				if (a)
					req('cm', id, { method: method.DELETE }).then((err) => {
						if (!err) {
							remove && remove(id);
						}
					});
			});
		};
	}

	function go(n) {
		page = n;
		req(
			'cmLs',
			{
				page,
				topic: d.id
			},
			{ method: method.GET }
		).then((a) => {
			d._cms = a;
		});
	}

	let editMod = false;
	$: {
		if (editMod) {
			d.done = (a) => {
				d = { ...d, ...a };
				editMod = false;
			};
			d.close = () => {
				editMod = false;
			};
		}
	}
	const rm = (i) => () => {
		const itm = d?._cms?.items;
		if (itm) {
			d._cms.items = itm.filter((a) => a !== i);
		}
	};
</script>

<div class="a" class:m={topic} transition:slide|global>
	{#if !topic}
		<div class="b">
			<div class="v">
				<Ava size={topic ? 16 : 32} idx={avatar} />
			</div>
			<p style={`${isAdm ? 'color:#ff5722' : ''}`}>{name}</p>
		</div>
	{/if}
	<div class="c">
		{#if editMod}
			<div class="e" transition:slide|global>
				<Cm edit={d} />
			</div>
		{:else}
			<p>
				{#if topic}
					<label>
						<span style={`${isAdm ? 'color:#ff5722' : ''}`}>{name}: </span>
					</label>
				{/if}
				{#if d._reply}<span>@{d._reply}</span>{/if}
				{d.content}
			</p>
			<div class="n">
				<div class="u">
					<button class="icon i-reply" on:click={reply} />
					{#if own === 1}
						<button class="icon i-ed" on:click={() => (editMod = 1)} />
					{/if}
					{#if own}
						<button class="icon i-del" on:click={del(d.id)} />
					{/if}
				</div>
				<div class="t">
					{#if d.state === 0}
						<span class="o">review needed</span>
					{/if}
					{#if d.save}
						<span>last edit at {time(d.save)}</span>
					{/if}
					{#if d.createAt}
						<span>{time(d.createAt)}</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	{#if (topic ? cur.topic === topic : cur.topic === d.id) && cur.reply === d.id}
		<div class="r" transition:slide|global>
			<Cm
				{user}
				{cur}
				done={done || ok}
				reply={{
					topic: topic || d.id,
					cm: d.id,
					name: name
				}}
			/>
		</div>
	{/if}
	{#if !topic}
		<div class="ls">
			{#each d._cms?.items || [] as i}
				<svelte:self d={i} {cur} {user} done={ok} topic={d.id} remove={rm(i)} />
			{/each}
			{#if d._cms?.total > 1}
				<div class="p">
					<Pg {page} total={d._cms?.total || 1} {go} />
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	@mixin bg {
		border: 1px solid rgba(80, 100, 150, 0.07);
		background: rgba(80, 100, 150, 0.07);
	}

	.o {
		color: orangered;
	}

	.p {
		display: flex;
		justify-content: flex-end;
	}

	.ls {
		width: 100%;
		padding-left: 80px;
		@include s() {
			padding: 0;
		}
	}

	.r {
		width: 100%;
		padding-left: 80px;
	}

	.a {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}

	.m {
		margin: 10px 0 0;
		flex-direction: column;
		@include bg;

		.r {
			padding-left: 0;
		}

		.n {
			button {
				padding: 0;
			}
		}

		.c {
			border: none;
			background: none;

			p {
				color: #8396af;
				padding: 0 5px 5px;
				font-size: 13px;
				line-height: 2;
				white-space: pre-wrap;

				& > span {
					padding: 0 5px;
					color: var(--darkgrey-h);
				}
			}
		}
	}

	label {
		display: inline-flex;
		align-items: center;

		span {
			font-size: inherit;
			line-height: inherit;
			padding: 0 5px;
		}
	}

	.b {
		padding: 15px 10px 0 0;
		width: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		@include s() {
			width: 100%;
			flex-direction: row;
			padding: 0 10px 10px;
			.v {
				:global {
					i {
						max-width: 20px;
						max-height: 20px;
					}
				}
			}
		}

		p {
			margin-top: 5px;
			word-break: break-all;
			font-size: 12px;
		}
	}

	.c {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 5px 0 0 7px;
		@include bg;

		p {
			flex-grow: 1;
			padding: 5px 10px 15px;
			white-space: normal;
			word-break: break-all;
			color: #a6afb4;
			line-height: 1.5;
			font-size: 15px;
		}
	}

	.t {
		display: flex;
		justify-content: flex-end;
		font-size: 12px;
		opacity: 0.6;
		flex: 1;
		align-items: center;

		span {
			padding-left: 10px;
		}
	}

	.u {
		display: flex;
		align-items: center;
	}

	.n {
		padding: 0 10px 5px;
		display: flex;
		flex-wrap: wrap;

		button {
			margin-right: 5px;
			padding: 5px 0;
			opacity: 0.5;
			left: -5px;

			&:hover {
				opacity: 1;
			}
		}
	}
</style>

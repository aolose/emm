<script>
	import { run } from 'svelte/legacy';

	import Ava from '$lib/components/post/ava.svelte';
	import { getErr } from '$lib/utils';
	import Ld from '$lib/components/loading.svelte';
	import { fade } from 'svelte/transition';
	import { req } from '$lib/req';
	import { msg } from './msg';
	let { admin = 0, slug, reply, done, edit, user = {}, cur = $bindable({}), av = [] } = $props();
	let sh = $state(0);
	let cm = $state(edit ? edit.content : '');
	let dis = $state();
	let ed = $state(0);
	let ld = $state(0);
	const limit = 512;

	function se() {
		ed = 1;
	}

	async function cmt() {
		ld = 1;
		const o = admin
			? {
					isAdm: 1,
					content: cm
				}
			: {
					_slug: slug,
					_name: cur.name,
					_avatar: cur.avatar,
					content: cm
				};
		if (reply?.cm) o.reply = reply.cm;
		if (reply?.topic) o.topic = reply.topic;
		req('cm', o)
			.then((a) => {
				if (!admin) user.set(o._name, o._avatar);
				const v = { ...o, ...a, _own: 1 };
				if (o.reply) v._reply = reply.name;
				done && done(v);
				msg.set([1, 'post success!']);
				cm = '';
			})
			.catch((e) => {
				msg.set([0, getErr(e)]);
			})
			.finally(() => {
				ld = 0;
			});
		// ld = 0;
	}

	function edi() {
		req('cm', { id: edit.id, content: cm }).then((a) => {
			msg.set([1, 'update success']);
			edit.done({
				...a,
				content: cm
			});
		});
	}

	run(() => {
		if (cur.name?.length > 10) cur.set({ name: cur.name.slice(0, 10) });
	});
	run(() => {
		cm = (cm || '').replace(/\n+/g, '\n').slice(0, limit);
		dis = (!admin && !cur.name?.length) || !cm?.length;
	});
</script>

<div class="c" class:m={reply} class:ed={edit} class:am={admin}>
	{#if !reply && !edit && sh}
		<div class="as" transition:fade|global>
			{#each av as a}
				<Ava
					idx={a}
					size={40}
					cls={'av' + (a === cur.avatar ? ' act' : '')}
					click={() => {
						cur.avatar = a;
						sh = 0;
					}}
				/>
			{/each}
		</div>
	{/if}
	{#if !edit}
		<div class="o">
			<div class="nf">
				{#if !reply}
					<Ava idx={cur.avatar} size="34" click={() => (sh = 1)} />
					{#if ed}
						<input bind:value={cur.name} placeholder="name" onblur={() => (ed = 0)} />
					{:else}
						<span class="n">{cur.name}</span>
						<button class="icon i-refresh" onclick={cur.refresh}></button>
						<button class="icon i-ed" onclick={se}></button>
					{/if}
				{:else}
					<p>reply @{reply.name}</p>
				{/if}
				<div class="s"></div>
			</div>
			{#if !admin}
				<button class="icon i-pub" class:dis onclick={cmt}></button>
			{/if}
		</div>
	{/if}
	<div class="sd">
		<div class="v">{cm}</div>
		<textarea placeholder="write something~" bind:value={cm}></textarea>
		<div class="ft">
			{#if edit}
				<div class="bn">
					<button class="icon i-ok" onclick={edi}></button>
					<button class="icon i-close" onclick={edit.close}></button>
				</div>
			{/if}
			<span class="t">{cm?.length || 0} / {limit}</span>
		</div>
	</div>
	{#if admin}
		<button class="pu" class:dis onclick={cmt}> reply</button>
	{/if}
	<Ld act={ld} text="submitting" />
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	:root {
		--bg: rgba(0, 0, 0, 0.15);
	}

	.ft {
		display: flex;
		justify-content: space-between;

		button {
			margin-right: 15px;
			padding: 0 3px;
		}
	}

	.t {
		position: absolute;
		right: 10px;
		bottom: 5px;
		font-size: 13px;
		color: #2e4a65;
	}

	.dis {
		opacity: 0;
		pointer-events: none;
	}

	input,
	.n {
		display: flex;
		align-items: center;
		height: 30px;
		font-weight: 200;
		min-width: 80px;
		font-size: 15px;
		max-width: 300px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 130px;
		margin-left: 10px;
	}

	input {
		border: none;
		background: var(--bg1);
	}

	.sd {
		border-top: 1px solid #0d1926;
		padding-bottom: 1px;
	}

	.i-pub {
		background: #477dc1;
		color: #fff;
		font-size: 18px;
		width: 40px;
		height: 30px;
		border-radius: 3px;
	}

	.nf {
		display: flex;
		align-items: center;
		flex: 1;

		p {
			font-size: 13px;
			color: var(--darkgrey);
		}
	}

	.n {
		margin-right: 10px;
		width: auto;
	}

	.c {
		margin-top: 20px;
		border-radius: 8px;
		border: 1px solid rgba(80, 100, 150, 0.07);
		background: rgba(108, 113, 126, 0.07);
	}

	.as {
		padding: 7px;
		position: absolute;
		height: 150px;
		top: -160px;
		width: 210px;
		overflow: hidden;
		background: rgba(10, 15, 20, 0.5);
		backdrop-filter: blur(15px);
		border: 1px solid #1d283a;
		box-shadow: rgba(0, 0, 0, 0.2) 0 3px 8px -3px;
		border-radius: 5px;
		display: flex;
		flex-wrap: wrap;

		:global {
			.av {
				background-position: center;
				background-repeat: no-repeat;
				background-size: auto 80%;
				margin: 3px;
				border-radius: 6px;

				&.act,
				&:hover {
					background-color: #000;
				}
			}
		}
	}

	.o {
		padding: 10px;
		display: flex;
		align-items: center;
	}

	.v {
		opacity: 0;
		pointer-events: none;
		min-height: 60px;
		overflow: hidden;
		max-height: 150px;
	}

	.v,
	textarea {
		padding: 10px 30px;
		white-space: pre-wrap;
		line-height: 1.5;
		font-size: 14px;
		margin-bottom: 20px;
	}

	textarea {
		border: none;
		width: 100%;
		resize: none;
		left: 0;
		right: 0;
		top: 5px;
		bottom: 10px;
		position: absolute;
		height: auto;
		color: #fff;
		background: none;
		&::placeholder {
			color: transparent;
			background: linear-gradient(142deg, rgb(65, 178, 255), rgb(255, 213, 213));
			background-clip: text;
		}
	}

	.m {
		margin: 0;
		height: auto;
		background: rgba(0, 0, 0, 0.05);

		.i-pub {
			font-size: 14px;
			width: 32px;
			height: 24px;
			margin-top: 5px;
		}

		.o {
			padding: 5px 10px;
		}

		.sd {
			border: none;
		}

		.v,
		textarea {
			padding: 0 10px;
		}

		.t {
			right: 10px;
			bottom: 5px;
			font-size: 12px;
		}

		.v {
			min-height: 50px;
		}
	}

	.ed {
		background: rgba(100, 100, 100, 0.05);
		margin: 0;

		.v,
		textarea {
			padding: 10px;
		}

		.t {
			right: 5px;
			bottom: 3px;
		}
	}

	.am,
	.sd {
		display: flex;
		flex-direction: column;
	}

	.am {
		height: 300px;
		@include s() {
			height: 200px;
			padding: 10px;
			.pu {
				font-size: 13px;
				border-radius: 3px;
				width: 80px;
				height: 24px;
				margin: 0;
				left: 20px;
				bottom: 15px;
				position: absolute;
			}
			.t {
				right: 0;
			}
		}

		.sd {
			padding: 0 10px;
			flex-grow: 1;
			max-height: 200px;

			.v,
			textarea {
				padding: 0 20px;
			}
		}

		.v {
			flex-grow: 1;
			max-height: none;
		}
	}

	.pu {
		width: 100px;
		transition: 0.2s;
		border-radius: 4px;
		position: relative;
		background: #496cad;
		margin: 10px 20px 20px auto;
		height: 30px;
		color: #ddd;
	}
</style>

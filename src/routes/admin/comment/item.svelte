<script>
	import Ava from '$lib/components/post/ava.svelte';
	import { time } from '$lib/utils';
	import { cmStatus } from '$lib/enum';
	import { slide } from 'svelte/transition';

	const stu = (a) => {
		switch (a) {
			case cmStatus.Reject:
				return 'Reject';
			case cmStatus.Approve:
				return 'Approve';
			case cmStatus.Pending:
				return 'Pending';
			default:
				return 'auto';
		}
	};
	let { topic, ck, d = {}, detail = 0 } = $props();
</script>

<div
	class="a"
	onclick={() => ck && ck(d)}
	class:dt={detail}
	class:tp={topic}
	transition:slide|global
>
	<div class="v">
		{#if !topic}
			<div class="b">
				<Ava idx={d.isAdm ? -1 : d._avatar} size={detail ? 18 : 32} />
			</div>
		{/if}
		<span>{d.isAdm ? 'admin' : d._name}</span>
		{#if topic}
			<span>create at: {time(d.createAt)}</span>
			{#if d.save}
				<span>update at: {time(d.save)}</span>{/if}
		{/if}
		{#if d._reply && detail}
			<span>@{d._reply}</span>
		{/if}
	</div>
	<div class="d">
		{#if !topic}
			<div class="h">
				{#if d._reply}
					<span class="rp">@{d._reply}</span>
				{/if}
				<s></s>
				<a target="_blank" href={'/post/' + d._post?.slug} rel="noreferrer">
					{d._post?.title}
				</a>
				<span
					title={stu(d.state)}
					class="s"
					class:ap={d.state === cmStatus.Approve}
					class:re={d.state === cmStatus.Reject}
					class:pe={d.state === cmStatus.Pending}
				>
					{stu(d.state)[0]}
				</span>
			</div>
		{/if}
		<div class="t">
			<p class="c">
				{#if topic && d._reply}
					<span class="rp">@{d._reply}</span>
				{/if}
				{d.content}
			</p>
			{#if !topic}
				<div class="i">
					{#if detail}
						<a target="_blank" href={'/post/' + d._post?.slug} rel="noreferrer">
							{d._post?.title}
						</a>
					{/if}
					<span>{d.ip || ''} {d._geo || ''}</span>
					<span>create at: {time(d.createAt)}</span>
					{#if d.save}
						<span>update at: {time(d.save)}</span>{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	@use '../../../lib/break' as *;

	.h {
		width: 100%;
		display: flex;

		align-items: center;

		s {
			flex: 1;
		}
	}

	.i {
		flex-grow: 1;
		height: 100%;
		align-items: flex-end;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;

		a {
			flex-shrink: 0;
		}

		span {
			padding: 0 5px 0 0;
			white-space: nowrap;
		}
	}

	a {
		margin-right: 10px;
		opacity: 0.5;
		font-size: 13px;
		color: inherit;
		text-decoration: underline;
	}

	.d {
		align-self: center;
		font-size: 14px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;

		span {
			color: var(--darkgrey-h);
		}
	}

	.c {
		padding: 10px 0;
		max-height: 100px;
		flex-grow: 1;
		color: #3b4557;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.t {
		font-size: 12px;
		color: #637288;
		display: flex;
		flex-direction: column;

		p {
			white-space: pre-wrap;
			line-height: 2;
			color: #ddd;
			max-height: none;
		}
	}

	.a {
		--bg: var(--bg5);
		transition: 0.1s linear;
		box-shadow: rgba(0, 0, 0, 0.1) 0 3px 20px -10px;
		border-radius: 4px;
		display: flex;
		margin: 5px;
		background: var(--bg);
		padding: 10px;
		cursor: pointer;
		border: 1px solid var(--bg5);

		&.act {
			--bg: var(--bg3);
		}

		&:hover {
			--bg: var(--bg2);
		}
	}

	.b {
		border-radius: 50%;
		overflow: hidden;
	}

	.v {
		padding-top: 10px;
		width: 80px;
		flex-grow: 0;
		flex-shrink: 0;
		display: flex;
		justify-content: flex-start;
		flex-direction: column;
		align-items: center;

		span {
			font-size: 13px;
			margin-top: 10px;
			width: 100%;
			text-align: center;
		}
	}

	.s {
		text-transform: uppercase;
		color: var(--darkgrey-h);
		background: var(--bg2);
		padding: 0;
		width: 16px;
		height: 16px;
		line-height: 16px;
		text-align: center;
		font-size: 10px !important;

		&.ap {
			color: #00bb00;
		}

		&.re {
			color: orange;
		}

		&.pe {
			color: #1c93ff;
		}
	}

	.dt {
		margin: 0;
		background: rgba(105, 125, 185, 0.05);
		flex-direction: column;
		cursor: auto;

		.rp {
			display: none;
		}

		.h {
			display: none;
		}

		.v {
			flex-direction: row;
			width: 100%;
			align-items: center;
			@include s() {
				padding: 10px;
			}

			span {
				width: auto;
				margin: 0;
				padding: 0 5px;
				font-size: 13px;
			}
		}

		.d {
			width: 100%;
			padding: 0 10px;
		}

		.t {
			display: block;
		}

		.c {
			max-width: none;
			padding: 20px 16px;
			overflow: auto;
			max-height: none;
			white-space: normal;
			@include s() {
				padding: 10px 0;
			}
		}

		.i {
			justify-content: flex-start;
			flex-direction: row;
			height: auto;
		}
	}

	.tp {
		flex-direction: column;
		cursor: auto;
		max-width: 500px;
		background: none;
		border: none;
		padding: 0 10px;
		margin-bottom: 0;

		.v {
			flex-direction: row;
			width: 100%;
			justify-content: flex-start;
			align-items: flex-start;

			span {
				padding-right: 10px;
				width: auto;
			}
		}

		.d {
			background: rgba(80, 100, 150, 0.2);
			width: 100%;
			margin: 10px;
			padding: 10px 20px;
			border-radius: 4px;
		}

		.rp {
			padding-right: 10px;
			font-size: 12px;
		}

		.c {
			width: 100%;
			max-width: none;
			overflow: auto;
		}
	}
</style>

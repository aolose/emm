<script>
	import Pg from './pg.svelte';
	import Item from './fItems.svelte';
	import { filesUpload, getProgress, upFiles } from '$lib/store';
	import { get } from 'svelte/store';

	let state = '';

	let fs = [];
	upFiles.subscribe((f) => {
		fs = f.map((f) => [f.name, getProgress(f), f.abort]);
	});
	function upload(e) {
		state = 0;
		const files = e.type === 'drop' ? e.dataTransfer.files : e.target.files;
		filesUpload(files);
	}

	const items = (n) => {
		const i = [];
		while (n--)
			i.push({
				name: 'file-' + n,
				type: ['png', 'img', 'txt'][n % 3],
				size: n * 100
			});
		return i;
	};

	export let select = [];
</script>

<div
	class="a"
	class:dr={state === 1}
	on:dragover|preventDefault={() => (state = 1)}
	on:drop|preventDefault={upload}
	on:dragleave|preventDefault={(state = 0)}
	on:dragend|preventDefault={(state = 0)}
>
	<div class="dp" />
	<div class="b">
		<div class="h">
			<div class="t">
				<button class="icon i-add">
					<input type="file" on:change={upload} />
				</button>
				<button class="icon i-del" />
				<button class="icon i-no" />
				<button class="icon i-ok" />
			</div>
			<s />
			<div class="s">
				<button class="icon i-search" />
				<input />
			</div>
			<button class="icon i-close" />
		</div>
		<div class="ls">
			{#each items(30) as file}
				<Item bind:file />
			{/each}
		</div>
		<div class="u" class:act={$upFiles.length}>
			{#each fs as u}
				<div class="r">
					<span>{u[0]}</span>
					<div class="t">
						<div style:width={`${get(u[1])}%`} />
					</div>
					<button class="icon i-close" on:click={u[2]} />
				</div>
			{/each}
		</div>
		<div class="p">
			<Pg />
		</div>
	</div>
</div>

<style lang="scss">
	s {
		flex: 1;
	}

	.u {
		height: 0;
		overflow: hidden;
		transition: 0.3s ease-in-out;
		padding: 0 10px;
		display: flex;
		flex-wrap: wrap;
		align-content: center;

		&.act {
			height: 100px;
			overflow: auto;
		}

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
		position: relative;
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

	.t {
	}

	.a {
		z-index: 5;
		position: fixed;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
		background: rgba(18, 22, 28, 0.76);
		backdrop-filter: blur(1px);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.b {
		position: relative;
		width: 600px;
		height: 600px;
		background: var(--bg2);
		display: flex;
		flex-direction: column;
	}

	.ls {
		background: var(--bg1);
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		overflow: auto;
		padding: 10px;
	}

	.p {
		display: flex;
		align-items: center;
		height: 50px;
		justify-content: center;
	}
</style>

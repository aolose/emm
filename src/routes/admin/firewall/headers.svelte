<script>
	import { hds2Str, str2Hds, watch } from '$lib/utils';

	export let value;
	let fields = [['', '']];
	let vWatch = watch('');
	let fWatch = watch(fields);

	function ck(i) {
		return () => {
			if (i) {
				fields.splice(i, 1);
				fields = [...fields];
			} else {
				fields = [...fields, ['', '']];
			}
		};
	}

	let t;
	$: {
		vWatch(() => {
			let v = [];
			if (value) v = str2Hds(value);
			if (!v.length) v = [['', '']];
			fields = v;
		}, value);
		fWatch(() => {
			if (!fields.length) {
				value = '';
			} else {
				fields.forEach((a) => {
					a[0] = a[0].replace(/[^0-9a-z_-]/gi, '');
					a[1] = a[1].replace(/\n/g, '');
				});
				clearTimeout(t);
				t = setTimeout(() => (value = hds2Str(fields)), 30);
			}
		}, fields);
	}
</script>

<div class="a">
	{#each fields as [k, v], index}
		<div class="b">
			<div class="e">
				<input class="s" bind:value={fields[index][0]} placeholder="name" />
				<div class="c">
					<p>{fields[index][1] || ''}</p>
					<textarea bind:value={fields[index][1]} placeholder="value" />
				</div>
			</div>
			{#if (index && fields[index][0]) || (!index && !fields.find((a) => !a[0]))}
				<button class:i-no={index} class:i-add={!index} on:click={ck(index)} class="icon" />
			{/if}
		</div>
	{/each}
</div>

<style lang="scss">
	@import '../../../lib/break.scss';

	.e {
		flex: 1;
		display: flex;
		@include s() {
			flex-direction: column;
		}
	}

	input {
		font-size: 13px;
		width: 100px;
		border-width: 0;
		border-right-width: 1px;
		@include s() {
			width: 100%;
			border-right: none;
			border-bottom-width: 1px;
		}
	}

	button {
		padding: 0 5px;
		border-left: 1px solid #304565;
	}

	.c {
		flex-grow: 1;
		@include s() {
			width: 100%;
			min-height: 32px;
		}
	}

	textarea {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		resize: none;
		width: 100%;
		overflow: hidden;
	}

	p {
		opacity: 0;
		pointer-events: none;
	}

	p,
	textarea {
		line-height: 30px;
		display: flex;
		height: 100%;
		border: none;
		margin: 0;
		word-break: break-all;
		white-space: normal;
		padding: 0 10px;
		font-size: 13px;
	}

	.b {
		width: 100%;
		display: flex;
		&:hover {
			background: rgba(0, 0, 0, 0.3);
		}

		& + .b {
			border-top: inherit;
			@include s() {
				border-top-width: 2px;
			}
		}
	}

	.a {
		resize: none;
		border: 1px solid #304565;
		background: var(--bg1);
		flex-grow: 1;
		box-shadow: inset var(--bg0) 0 0 5px;
	}
</style>

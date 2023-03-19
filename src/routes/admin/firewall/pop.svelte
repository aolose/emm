<script>
	import HdsIpt from './headers.svelte';
	import { fade } from 'svelte/transition';
	import { slidLeft } from '$lib/transition';
	import Ck from './ck.svelte';
	import Sel from './sel.svelte';
	import { getErr, trim } from '$lib/utils';
	import { slide } from 'svelte/transition';
	import { confirm } from '$lib/store';

	let d = {};
	let show = 0;
	let tp = 0; // 0- filter 1-editor 2-create
	let ok = () => 0;
	let cancel = () => 0;
	let hasV;
	$: {
		d.ip = trim(d.ip);
		d.mark = trim(d.mark, true);
		d.country = trim(d.country);
		d.path = trim(d.path);
		d.times = +d.times || 1;
		d.redirect = trim(d.redirect);
		d.status = (d.status || '').replace(/[^0-9;, \-~]/g, '');
		hasV = trim(
			tp === 3 ||
				(d.trigger ? '' : d.ip) ||
				(d.trigger ? d.status : '') ||
				d.path ||
				d.headers ||
				d.mark ||
				(d.trigger ? '' : d.country) ||
				''
		);
	}
	export const pop = (type, data = {}) => {
		tp = type;
		if (tp === 2) {
			data.active = data.log = true;
		}
		return new Promise((resolve) => {
			show = 1;
			d = { ...data };
			ok = () => {
				if (d.redirect) {
					try {
						new URL(d.redirect);
					} catch (e) {
						confirm(getErr(e), '', 'ok');
						return;
					}
				}
				resolve({ ...d });
				show = 0;
			};
			cancel = () => {
				resolve();
				show = 0;
			};
		});
	};
</script>

{#if show}
	<div class="m" transition:fade>
		<div class="f">
			<h1>{['Search logs', 'Edit Rule', 'Create Rule', 'Edit blacklist'][tp]}</h1>
			<button class="clo" on:click={cancel}>
				<i />
				<i />
			</button>
			{#if tp && tp !== 3}
				<div class="f1">
					<label>
						<Ck bind:value={d.active}>activate</Ck>
					</label>
					{#if tp}
						<label>
							<Ck bind:value={d.trigger}>trigger</Ck>
						</label>
					{/if}
					{#if !d.trigger}
						<label transition:slidLeft>
							<Ck bind:value={d.log}>log</Ck>
						</label>
						<label transition:slidLeft>
							<Ck bind:value={d.forbidden}>forbidden</Ck>
						</label>
					{:else}
						<s />
					{/if}
				</div>
			{/if}
			<div class="f0">
				{#if tp !== 3}
					{#if !d.trigger}
						<label transition:slide>
							<span>IP:</span>
							<input bind:value={d.ip} />
						</label>
					{/if}
					<label>
						<span>path:</span>
						<input bind:value={d.path} />
					</label>
					<label>
						<span>header:</span>
						<HdsIpt bind:value={d.headers} />
					</label>
					{#if d.trigger}
						<label transition:slide>
							<span>status:</span>
							<input bind:value={d.status} />
						</label>
						<label transition:slide>
							<span title="times per hour">TPH:</span>
							<input bind:value={d.times} />
						</label>
					{:else}
						<label transition:slide>
							<span>method:</span>
							<Sel
								items={['', 'GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'HEAD', 'OPTIONS']}
								bind:value={d.method}
							/>
						</label>
						<label transition:slide>
							<span>country:</span>
							<input bind:value={d.country} />
						</label>
					{/if}
				{/if}
				{#if !d.forbidden || d.trigger || tp === 3}
					<label transition:slide>
						<span>redirect:</span>
						<input bind:value={d.redirect} />
					</label>
				{/if}
				<label>
					<span>mark:</span>
					<input bind:value={d.mark} />
				</label>
			</div>
			<div class="fn">
				<button on:click={() => (d = {})}>clear</button>
				{#if !tp || hasV}
					<button transition:slidLeft on:click={ok}
						>{['search', 'save', 'create', 'save'][tp]}</button
					>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@import '../../../lib/break';

	s {
		flex: 1;
	}

	h1 {
		width: 100%;
		background: var(--bg1);
		pointer-events: none;
		top: 0;
		padding: 0 20px;
		border-radius: 10px 10px 0 0;
		left: 0;
		color: #465469;
		font-size: 22px;
		line-height: 60px;
		font-weight: 200;
		position: absolute;
		@include s() {
			font-size: 18px;
			line-height: 50px;
		}
	}

	.clo {
		position: absolute;
		transition: 0.2s ease-in-out;
		right: 10px;
		top: 5px;
		width: 50px;
		height: 50px;
		color: #3a537c;

		&:hover {
			color: #00d2ff;

			i {
				transform: rotate(35deg);
				transform-origin: right;
				width: 20px;
				margin-left: 20px;

				& + i {
					transform: rotate(-35deg);
				}
			}
		}

		i {
			transition: inherit;
			transform: rotate(45deg);
			position: absolute;
			top: 0;
			left: 0;
			margin: 24px 10px;
			background: currentColor;
			width: 30px;
			height: 1px;

			& + i {
				transform: rotate(-45deg);
			}
		}

		@include s() {
			top: 3px;
			right: 10px;
			width: 40px;
			height: 40px;
			&:hover {
				color: #3a537c;

				i {
					transform-origin: center;
					transform: rotate(45deg);

					& + i {
						transform: rotate(-45deg);
					}
				}
			}
		}
	}

	.fn {
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;

		button {
			font-size: 14px;
			width: 150px;
			border-radius: 20px;
			cursor: pointer;
			color: #354e65;
			border: 1px solid currentColor;
			margin: 0 20px;
			padding: 7px 20px;
			transition: 0.3s ease-in-out;
			@include s() {
				width: 100px;
				margin: 0 10px;
			}

			&:hover {
				background: #1c93ff;
				color: #fff;
				border-color: transparent;
			}
		}
	}

	label {
		font-size: 15px;
		align-items: flex-start;

		input {
			width: 0;
			resize: none;
			border: 1px solid #304565;
			background: var(--bg1);
			flex: 1;
			box-shadow: inset var(--bg0) 0 0 5px;
		}

		span {
			line-height: 32px;
			color: #8092a9;
			text-align: right;
			padding-right: 10px;
			width: 80px;
			flex-shrink: 0;
		}

		display: flex;
		padding: 10px;
	}

	.f {
		transition: 0.3s ease-in-out;
		height: 640px;
		padding: 60px 0 0;
		display: flex;
		flex-direction: column;
		width: 500px;
		background: var(--bg0);
		border-radius: 10px;
		box-shadow: rgba(0, 0, 0, 0.3) 0 10px 30px;
		@include s() {
			height: 100%;
		}
	}

	.f0 {
		flex: 1;
		padding: 20px;
		overflow: auto;
	}

	.f1 {
		background: rgba(0, 0, 0, 0.2);
		display: flex;
		padding: 0 20px;

		span {
			width: auto;
			text-align: left;
			padding-left: 10px;
		}

		@include s() {
			flex-wrap: wrap;
			label {
				white-space: nowrap;
				width: auto;
				flex: 1;
			}
		}
	}

	.m {
		backdrop-filter: blur(1px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		position: fixed;
		left: 72px;
		top: 0;
		bottom: 0;
		right: 0;
		background: rgba(100, 100, 100, 0.1);
		@include s() {
			left: 0;
			top: 48px;
		}
	}
</style>

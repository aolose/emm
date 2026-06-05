<script>
	import HdsIpt from './headers.svelte';
	import { fade } from 'svelte/transition';
	import { slidLeft } from '$lib/transition';
	import Ck from './ck.svelte';
	import Sel from './sel.svelte';
	import { trim } from '$lib/utils';
	import { slide } from 'svelte/transition';
	import { fwRespLs } from '$lib/store';
	import { onMount } from 'svelte';

	let { pop = $bindable() } = $props();
	onMount(() => {
		pop = (type, data = {}) => {
			tp = type;
			if (tp === 2) {
				data.active = data.log = true;
			}
			return new Promise((resolve) => {
				show = 1;
				d = { ...data };
				ok = () => {
					resolve({ ...d });
					show = 0;
				};
				cancel = () => {
					resolve();
					show = 0;
				};
			});
		};
	});
	let d = $state({});
	let show = $state(0);
	let tp = $state(0); // 0- filter 1-editor 2-create
	let ok = $state(() => 0);
	let cancel = $state(() => 0);
	let hasV = $state();
	$effect(() => {
		if (tp < 4) {
			d.ip = trim(d.ip);
			d.mark = trim(d.mark, true);
			d.country = trim(d.country);
			d.path = trim(d.path);
			if (tp) {
				d.rate = trim(d.rate || '')
					.replace(/[^0-9,/]/g, '')
					.replace(/\/{2,}/g, '/');
				d.uaCount = trim(d.uaCount || '').replace(/[^0-9]/g, '');
				d.schedule = trim(d.schedule || '')
					.replace(/[^0-9,\-]/g, '')
					.replace(/\-{2,}/g, '-');
				d.weight = +d.weight || 100;
				if (d.weight < 1) d.weight = 1;
				d.timeout = +d.timeout || 3;
				if (d.timeout < 1) d.timeout = 1;
				if (d.timeout > 10) d.timeout = 10;
				d.uaWindow = +d.uaWindow || 60;
				if (d.uaWindow < 30) d.uaWindow = 30;
				if (d.uaWindow > 3600) d.uaWindow = 3600;
			}
			d.status = (d.status || '').replace(/[^0-9;, \-~]/g, '');
			const isUa = d.uaMode && d.trigger;
			const isAbandon = d.abandon && d.trigger;
			hasV = trim(
				tp === 3 ||
					isAbandon ||
					(isAbandon ? '' : isUa ? d.path && d.rate : d.trigger ? '' : d.ip) ||
					(isUa || isAbandon ? '' : d.trigger ? d.status : '') ||
					(isUa || isAbandon ? '' : d.path) ||
					(isUa || isAbandon ? '' : d.headers) ||
					d.mark ||
					(isUa || isAbandon ? '' : d.trigger ? '' : d.country) ||
					''
			);
		} else if (tp >= 6) {
			d.ip = trim(d.ip);
			d.mark = trim(d.mark, true);
			hasV = trim(d.ip);
		} else {
			d.name = trim(d.name, true);
			d.status = +d.status || 403;
			if (d.status < 0 || d.status > 510) d.status = 403;
			hasV = trim(d.name) && d.status;
		}
	});
</script>

{#if show}
	<div class="m" transition:fade|global>
		<div class="f">
			<h1>
				{[
					'Search logs',
					'Edit Rule',
					'Create Rule',
					'Edit blacklist',
					'Add Response',
					'Edit Response',
					'Add whitelist',
					'Edit whitelist'
				][tp]}
			</h1>
			<button class="clo" onclick={cancel}>
				<i></i>
				<i></i>
			</button>
			{#if tp < 4 && tp && tp !== 3}
				<div class="f1">
					<label>
						<Ck bind:value={d.active}>Activate</Ck>
					</label>
					<label>
						<Ck bind:value={d.cfUpload}>CF Upload</Ck>
					</label>
					<label>
						<Ck bind:value={d.log}>Log</Ck>
					</label>
					{#if tp}
						<label>
							<Ck bind:value={d.trigger}>trigger</Ck>
						</label>
					{/if}
					{#if d.trigger && tp}
						<label>
							<Ck
								bind:value={d.uaMode}
								onchange={() => {
									if (d.uaMode) d.abandon = false;
								}}
								>Collection
							</Ck>
						</label>
						<label>
							<Ck
								bind:value={d.abandon}
								onchange={() => {
									if (d.abandon) {
										d.uaMode = false;
										d.path = '';
									}
								}}
								>Abandon
							</Ck>
						</label>
					{/if}
				</div>
			{/if}
			<div class="f0">
				{#if tp < 4}
					{#if tp !== 3}
						{#if !d.trigger && !d.abandon}
							<label transition:slide|global>
								<span>IP:</span>
								<input bind:value={d.ip} />
							</label>
						{/if}
						{#if !(d.trigger && d.abandon)}
							<label>
								<span
									>path
									{#if d.trigger && d.uaMode}*{/if}:</span
								>
								<input bind:value={d.path} />
							</label>
						{/if}
						{#if !(d.trigger && d.uaMode) && !(d.trigger && d.abandon)}
							<label>
								<span>header:</span>
								<HdsIpt bind:value={d.headers} />
							</label>
						{/if}
						{#if d.trigger && d.uaMode}
							<label transition:slide|global>
								<span>ua (regex):</span>
								<input bind:value={d.ua} placeholder="optional UA regex" />
							</label>
							<label transition:slide|global>
								<span>uaCount:</span>
								<input bind:value={d.uaCount} placeholder="min distinct IPs" />
							</label>
							<label transition:slide|global>
								<span>rate*:</span>
								<input bind:value={d.rate} placeholder="min total requests" />
							</label>
							<label transition:slide|global>
								<span>uaWindow:</span>
								<input bind:value={d.uaWindow} placeholder="seconds (30-3600)" />
							</label>
						{:else if d.trigger && d.abandon}
							<label transition:slide|global>
								<span>timeout:</span>
								<input bind:value={d.timeout} placeholder="seconds (1-10)" />
							</label>
						{:else if d.trigger && !d.abandon}
							<label transition:slide|global>
								<span>status:</span>
								<input bind:value={d.status} />
							</label>
							<label transition:slide|global>
								<span title="times per hour">rate:</span>
								<input bind:value={d.rate} placeholder="times/seconds,..." />
							</label>
						{:else}
							<label transition:slide|global>
								<span>method:</span>
								<Sel
									items={['', 'GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'HEAD', 'OPTIONS']}
									bind:value={d.method}
								/>
							</label>
							<label transition:slide|global>
								<span>country:</span>
								<input bind:value={d.country} />
							</label>
						{/if}
						{#if d.trigger}
							<label transition:slide|global>
								<span>schedule (UTC+0):</span>
								<input bind:value={d.schedule} placeholder="0-6,18-23,23-2" />
							</label>
						{/if}
					{/if}
					{#if tp && tp < 6}
						<label transition:slide|global>
							<span>response:</span>
							<Sel
								defaultValue={0}
								items={[{ name: 'empty', id: 0 }].concat($fwRespLs)}
								getValue={(a) => a?.id}
								getText={(a) => a?.name || 'empty'}
								multiply={false}
								bind:value={d.respId}
							/>
						</label>
					{/if}
					{#if tp && tp < 6}
						<label transition:slide|global>
							<span>weight:</span>
							<input type="number" bind:value={d.weight} placeholder="100" />
						</label>
					{/if}
					<label>
						<span>mark:</span>
						<input bind:value={d.mark} />
					</label>
				{/if}
				{#if !tp}
					<label>
						<span>status:</span>
						<input bind:value={d.status} />
					</label>
				{/if}
				{#if tp >= 6}
					<label>
						<span>IP:</span>
						<input bind:value={d.ip} />
					</label>
					<label>
						<span>mark:</span>
						<input bind:value={d.mark} />
					</label>
				{/if}
				{#if tp >= 4 && tp < 6}
					<label>
						<span>name:</span>
						<input bind:value={d.name} />
					</label>
					<label>
						<span>status:</span>
						<input bind:value={d.status} />
					</label>
					<label>
						<span>header:</span>
						<HdsIpt bind:value={d.headers} />
					</label>
				{/if}
			</div>
			<div class="fn">
				<button onclick={() => (d = {})}>clear</button>
				{#if !tp || hasV}
					<button transition:slidLeft|global onclick={ok}>
						{['search', 'save', 'create', 'save', 'create', 'save', 'create', 'save'][tp]}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '../../../lib/break' as *;

	s {
		flex: 1;
	}

	h1 {
		pointer-events: none;
		top: 0;
		padding: 0 20px;
		border-radius: 10px 10px 0 0;
		left: 6px;
		color: transparent;
		background: linear-gradient(142deg, rgb(0 150 250), rgb(222 234 255));
		background-clip: text;
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
		padding: 0;
		position: absolute;
		transition: 0.2s ease-in-out;
		right: 10px;
		top: 5px;
		background: none;
		width: 50px;
		overflow: hidden;
		height: 50px;
		color: #3a537c;
		transform: scale(0.9);

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
			transform: scale(0.7);
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
		height: 120px;
		display: flex;
		align-items: center;
		gap: 16px;
		justify-content: center;

		button {
			width: 100px;
			border-radius: 111px;
			filter: hue-rotate(60deg);

			& + button {
				filter: hue-rotate(-30deg);
			}
		}
	}

	label {
		font-size: 15px;
		align-items: flex-start;
		display: flex;

		input {
			width: 0;
			resize: none;
			background: var(--bg1);
			flex: 1;
		}

		span {
			line-height: 48px;
			color: #8092a9;
			text-align: right;
			padding-right: 10px;
			width: 80px;
			flex-shrink: 0;
		}
	}

	.f {
		transition: 0.3s ease-in-out;
		height: 640px;
		padding: 60px 0 0;
		display: flex;
		flex-direction: column;
		width: 500px;
		background: var(--bg0);
		border-radius: 16px;
		box-shadow: rgba(0, 0, 0, 0.3) 0 10px 30px;
		@include s() {
			height: 100%;
		}
	}

	.f0 {
		flex: 1;
		padding: 20px;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.f1 {
		gap: 14px;
		background: rgb(0 0 0 / 33%);
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		flex-wrap: wrap;
		margin: 8px;
		padding: 12px;
		border-radius: 4px;

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

<script>
	import { req } from '$lib/req';
	import { sys } from './sys';
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import Tip from './Tip.svelte';
	import { getErr } from '$lib/utils';

	let _sys = $state({});
	let fwAggregate = $state(true);
	let fwLastCount = $state(0);
	let fwLastAggregateAt = $state(0);
	let ld = $state(false);
	let err = $state(0);
	let msg = $state('');
	let act = $state(0);

	onMount(() => {
		return sys.subscribe(s => {
			_sys = s;
			fwAggregate = s.fwAggregate !== false;
			fwLastCount = s.fwLastCount || 0;
			fwLastAggregateAt = s.fwLastAggregateAt || 0;
		});
	});

	const save = () => {
		ld = true;
		req('sys', { ..._sys, fwAggregate })
			.then(() => {
				act = 1;
				err = 0;
				msg = 'Saved';
				sys.update((a) => ({ ...a, fwAggregate }));
			})
			.catch((e) => {
				act = 1;
				err = 1;
				msg = getErr(e);
			})
			.finally(() => (ld = false));
	};

	$effect(() => {
		if (act) {
			setTimeout(() => (act = 0), 2000);
		}
	});

	function formatTime(ts) {
		if (!ts) return 'Never';
		return new Date(ts).toLocaleString();
	}
</script>

<Card {act} {msg} {err} title="Firewall" {save} {ld}>
	<Tip>
		Aggregate blacklist IPs to reduce list size.
		When enabled, IPs in the same /24 subnet (>5) are merged into a CIDR block,
		and /24 blocks in the same /16 (>5) are further merged.
	</Tip>

	<div class="ch">
		<label class="switch">
			<input type="checkbox" bind:checked={fwAggregate} onchange={save} />
			<span class="slider"></span>
		</label>
		<span class="lb">Aggregate Blacklist</span>
	</div>

	<div class="stats">
		<span>Last IP count: <b>{fwLastCount}</b></span>
		<span>Last aggregated: <b>{formatTime(fwLastAggregateAt)}</b></span>
	</div>
</Card>

<style lang="scss">
	.ch {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 20px;
	}

	.lb {
		font-size: 14px;
		color: #ccc;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		flex-shrink: 0;

		input {
			opacity: 0;
			width: 0;
			height: 0;
		}

		.slider {
			position: absolute;
			cursor: pointer;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 24px;
			transition: 0.3s;

			&::before {
				content: '';
				position: absolute;
				height: 18px;
				width: 18px;
				left: 3px;
				bottom: 3px;
				background: #fff;
				border-radius: 50%;
				transition: 0.3s;
			}
		}

		input:checked + .slider {
			background: #477dc1;
		}

		input:checked + .slider::before {
			transform: translateX(20px);
		}
	}

	.stats {
		display: flex;
		gap: 24px;
		padding: 4px 20px 16px;
		font-size: 13px;
		color: #6c7a93;

		b {
			color: #94abc0;
			font-weight: 500;
		}
	}
</style>
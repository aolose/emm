<script>
	import { onMount } from 'svelte';
	import { sys } from './sys';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import { getErr, trim } from '$lib/utils';
	import { req } from '$lib/req';

	let siteKey = $state('');
	let secret = $state('');
	let ttl = $state(1800);
	let enabled = $state(false);
	let msg = $state('');
	let ld = $state(false);
	let err = $state(0);
	let act = $state(0);

	onMount(() =>
		sys.subscribe((a) => {
			siteKey = a.tsSiteKey || '';
			enabled = !!a.tsEnabled;
			ttl = a.tsVerifyTTL || 1800;
			// secret is loaded only for Admin — if present, show it
			if (a.tsSecret !== undefined) secret = a.tsSecret || '';
		})
	);

	const save = () => {
		ld = true;
		const o = {
			tsEnabled: enabled,
			tsSiteKey: trim(siteKey),
			tsSecret: trim(secret),
			tsVerifyTTL: Math.abs(+ttl) || 1800,
		};
		req('sys', o)
			.then(() => {
				act = 1;
				err = 0;
				msg = 'Turnstile settings saved';
				sys.update((a) => ({ ...a, ...o }));
			})
			.catch((e) => {
				act = 1;
				err = 1;
				msg = getErr(e);
			})
			.finally(() => (ld = false));
	};

	$effect(() => {
		ttl = Math.abs(+ttl) || 1800;
		if (act) {
			setTimeout(() => (act = 0), 2000);
		}
	});
</script>

<Card {act} {msg} {err} title="Turnstile" {save} ld={ld}>
	<div class="ch">
		<label class="switch">
			<input type="checkbox" bind:checked={enabled} />
			<span class="slider"></span>
		</label>
		<span class="lb">Enable Turnstile anti-crawl</span>
	</div>
	<Ipt label="Site Key" bind:value={siteKey} placeholder="Cloudflare Turnstile site key" />
	<Ipt label="Secret Key" bind:value={secret} placeholder="Cloudflare Turnstile secret key" password={true} />
	<Ipt label="Cookie TTL (seconds)" bind:value={ttl} placeholder="1800" />
	<div class="note">
		<span class="icon i-info"></span>
		After a user passes verification, they get a cookie valid for this duration.
		Once expired, they will need to re-verify on their next request.
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

	.note {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px 20px;
		font-size: 13px;
		color: #6c7a93;
		line-height: 1.5;

		.icon {
			flex-shrink: 0;
			margin-top: 2px;
			opacity: 0.6;
		}
	}
</style>

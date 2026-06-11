<script>
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { sys } from './sys';
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import Tip from './Tip.svelte';

	let ld = $state(false);
	let err = $state(0);
	let msg = $state('');

	let _sys = $state({});
	let r2Enabled = $state(false);
	let r2AccountId = $state('');
	let r2AccessKeyId = $state('');
	let r2SecretAccessKey = $state('');
	let r2Bucket = $state('');
	let r2PublicDomain = $state('');

	onMount(() => {
		return sys.subscribe((s) => {
			_sys = s;
			r2Enabled = !!s.r2Enabled;
			r2AccountId = s.r2AccountId || '';
			r2AccessKeyId = s.r2AccessKeyId || '';
			r2SecretAccessKey = s.r2SecretAccessKey || '';
			r2Bucket = s.r2Bucket || '';
			r2PublicDomain = s.r2PublicDomain || '';
		});
	});

	async function save() {
		ld = true;
		err = 0;
		msg = '';
		const s = {};
		if (r2Enabled !== !!_sys.r2Enabled) s.r2Enabled = r2Enabled;
		if (r2AccountId !== (_sys.r2AccountId || '')) s.r2AccountId = r2AccountId;
		if (r2AccessKeyId) s.r2AccessKeyId = r2AccessKeyId;
		if (r2SecretAccessKey) s.r2SecretAccessKey = r2SecretAccessKey;
		if (r2Bucket !== (_sys.r2Bucket || '')) s.r2Bucket = r2Bucket;
		if (r2PublicDomain !== (_sys.r2PublicDomain || '')) s.r2PublicDomain = r2PublicDomain;
		if (!Object.keys(s).length) {
			ld = false;
			return;
		}
		try {
			await req('sys', { ..._sys, ...s });
			sys.update((a) => ({ ...a, ...s }));
			msg = 'Saved';
		} catch (e) {
			err = 1;
			msg = (e && (e.data || e.message)) || 'Save failed';
		} finally {
			ld = false;
		}
	}
</script>

<Card title="R2 Storage" {save} {ld} {err} {msg}>
	<Tip>
		Upload files to Cloudflare R2 instead of local disk. Requires an R2 API token with Object Read &
		Write permissions. Create one in
		<a href="https://dash.cloudflare.com" target="_blank" rel="noopener">Cloudflare Dashboard</a>
		→ R2 → Manage R2 API Tokens.
	</Tip>

	<div class="switch-row">
		<label class="switch">
			<input type="checkbox" bind:checked={r2Enabled} />
			<span class="slider"></span>
		</label>
		<span class="label-text">Enable R2 storage</span>
	</div>

	<Ipt label="Account ID" bind:value={r2AccountId} placeholder="R2 Account ID" />

	<Ipt label="Access Key ID" bind:value={r2AccessKeyId} placeholder="R2 Access Key ID" />

	<Ipt
		label="Secret Access Key"
		bind:value={r2SecretAccessKey}
		placeholder="R2 Secret Access Key"
		password
	/>

	<Ipt label="Bucket" bind:value={r2Bucket} placeholder="my-bucket" />

	<Ipt label="Public Domain" bind:value={r2PublicDomain} placeholder="https://cdn.example.com" />
</Card>

<style lang="scss">
	.switch-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 28px 4px;
	}

	.label-text {
		font-size: 14px;
		color: #8d9cb5;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 22px;

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
			background-color: #2a3748;
			transition: 0.3s;
			border-radius: 22px;
		}

		.slider:before {
			position: absolute;
			content: '';
			height: 16px;
			width: 16px;
			left: 3px;
			bottom: 3px;
			background-color: #627079;
			transition: 0.3s;
			border-radius: 50%;
		}

		input:checked + .slider {
			background-color: #3b82f6;
		}

		input:checked + .slider:before {
			transform: translateX(18px);
			background-color: #fff;
		}
	}

	:global(a) {
		color: #60a5fa;
		text-decoration: none;
	}
</style>

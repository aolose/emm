<script lang="ts">
	import { onMount } from 'svelte';
	import { sys } from './sys';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import { getErr, trim } from '$lib/utils';
	import { req } from '$lib/req';
	import { aiStatus, validateAi } from '$lib/components/ai/aiStore';
	import { get } from 'svelte/store';

	let apiKey = $state('');
	let model = $state('');
	let msg = $state('');
	let ld = $state(false);
	let err = $state(0);
	let act = $state(0);
	let validating = $state(false);

	onMount(() =>
		sys.subscribe((a) => {
			apiKey = a.aiApiKey || '';
			model = a.aiModel || 'deepseek-chat';
		})
	);

	const save = async () => {
		ld = true;
		const o = {
			aiApiKey: trim(apiKey),
			aiModel: trim(model) || 'deepseek-chat',
		};
		try {
			await req('sys', o);
			act = 1;
			err = 0;
			msg = 'Saved.';
			sys.update((a) => ({ ...a, ...o }));
			// Re-validate after config change
			validating = true;
			aiStatus.set('checking');
			await validateAi();
		} catch (e) {
			act = 1;
			err = 1;
			msg = getErr(e);
		} finally {
			ld = false;
			validating = false;
		}
	};

	const validate = async () => {
		validating = true;
		await validateAi();
		validating = false;
		const st = get(aiStatus);
		if (st === 'available') {
			act = 1;
			err = 0;
			msg = 'AI service is available.';
		} else if (st === 'invalid') {
			act = 1;
			err = 1;
			msg = 'API key is invalid.';
		} else if (st === 'no_key') {
			act = 1;
			err = 1;
			msg = 'Please configure an API key first.';
		} else {
			act = 1;
			err = 1;
			msg = 'AI service check failed.';
		}
	};

	$effect(() => {
		if (act) {
			setTimeout(() => (act = 0), 3e3);
		}
	});

	function statusLabel(st: string) {
		switch (st) {
			case 'checking': return 'Checking...';
			case 'available': return 'Connected';
			case 'no_key': return 'No API key';
			case 'invalid': return 'Invalid key';
			case 'error': return 'Error';
			default: return 'Unknown';
		}
	}
</script>

<Card {act} {msg} {err} title="AI Integration" {save} {ld}>
	<Ipt label="API Key" bind:value={apiKey} password placeholder="sk-..." />
	<Ipt label="Model" bind:value={model} placeholder="deepseek-chat" />
	<div class="status-row">
		<span class="status-label">Status:</span>
		<span class="status-value" class:available={$aiStatus === 'available'} class:error={$aiStatus !== 'available' && $aiStatus !== 'checking'}>
			{statusLabel($aiStatus)}
		</span>
		<button class="validate-btn" onclick={validate} disabled={validating || !apiKey.trim()}>
			{validating ? 'Checking...' : 'Test Connection'}
		</button>
	</div>
</Card>

<style lang="scss">
	@use '../../../lib/break' as *;

	.status-row {
		font-size: 14px;
		margin: 10px;
		display: flex;
		padding: 10px 20px;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		@include s() {
			padding: 8px;
		}
	}

	.status-label {
		flex-shrink: 0;
		width: 128px;
		@include s() {
			width: 100%;
			padding-left: 8px;
		}
	}

	.status-value {
		font-size: 13px;
		padding: 4px 10px;
		border-radius: 4px;

		&.available {
			color: #5a9;
		}
		&.error {
			color: #c55;
		}
	}

	.validate-btn {
		margin-left: auto;
		padding: 6px 14px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.08);
		color: #8a9bb5;
		cursor: pointer;
		font-size: 13px;

		&:hover:not(:disabled) {
			background: rgba(255, 255, 255, 0.15);
			color: #c8d3ee;
		}

		&:disabled {
			opacity: 0.4;
			cursor: default;
		}
	}
</style>

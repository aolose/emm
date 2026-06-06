<script>
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { sys } from './sys';
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import Tip from './Tip.svelte';

	let validating = $state(false);
	let tokenValid = $state(null);
	let lists = $state([]);
	let loadingLists = $state(false);
	let ld = $state(false);
	let err = $state(0);
	let msg = $state('');

	let _sys = $state({});
	let cfAccountId = $state('');
	let cfApiToken = $state('');
	let cfListId = $state('');

	// Subscribe to store. The parent +page.svelte calls load() in
	// onMount which is async — get(sys) during render returns {}.
	// The subscription catches the first non-empty update.
	onMount(() => {
		return sys.subscribe((s) => {
			_sys = s;
			if (s.cfAccountId || s.cfListId || s.cfApiToken) {
				cfAccountId = s.cfAccountId || '';
				cfApiToken = s.cfApiToken || '';
				cfListId = s.cfListId || '';
			}
		});
	});

	async function validate() {
		validating = true;
		tokenValid = null;
		try {
			const r = await req('cfValidate', undefined, { method: method.GET });
			tokenValid = r.valid;
		} catch {
			tokenValid = false;
		} finally {
			validating = false;
		}
	}

	async function loadLists() {
		loadingLists = true;
		try {
			const r = await req('cfLists', undefined, { method: method.GET });
			lists = r || [];
		} catch {
			lists = [];
		} finally {
			loadingLists = false;
		}
	}

	async function save() {
		ld = true;
		err = 0;
		msg = '';
		const s = {};
		if (cfAccountId !== (_sys.cfAccountId || '')) s.cfAccountId = cfAccountId;
		if (cfApiToken) s.cfApiToken = cfApiToken;
		if (cfListId !== (_sys.cfListId || '')) s.cfListId = cfListId;
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

	function selectList(id) {
		cfListId = id;
		save();
	}
</script>

<Card title="Cloudflare Integration" {save} {ld} {err} {msg}>
	<Tip>
		Push blocked IPs to Cloudflare IP Lists for edge-level filtering. Requires a Cloudflare API
		token with Account:Rulesets:Edit permission.
	</Tip>

	<Ipt label="Account ID" bind:value={cfAccountId} placeholder="Cloudflare Account ID" />

	<Ipt label="API Token" bind:value={cfApiToken} placeholder="Cloudflare API Token" password />

	<div class="cf-row">
		<Ipt label="List ID" bind:value={cfListId} placeholder="IP List ID" />
		<div class="cf-actions">
			<button class="btn" onclick={validate} disabled={validating}>
				{validating ? 'Checking...' : 'Test Connection'}
			</button>
			<button class="btn" onclick={loadLists} disabled={loadingLists}>
				{loadingLists ? 'Loading...' : 'Fetch Lists'}
			</button>
		</div>
	</div>

	{#if tokenValid !== null}
		<div class="cf-status" class:ok={tokenValid} class:err={!tokenValid}>
			{tokenValid ? 'Token valid' : 'Token invalid or not configured'}
		</div>
	{/if}

	{#if lists.length > 0}
		<div class="cf-lists">
			<span class="label">Available IP Lists:</span>
			{#each lists as list}
				<button
					class="list-item"
					class:sel={cfListId === list.id}
					onclick={() => selectList(list.id)}
				>
					<span class="name">{list.name}</span>
					<span class="count">{list.num_items} items</span>
				</button>
			{/each}
		</div>
	{/if}
</Card>

<style lang="scss">
	.cf-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.cf-actions {
		display: flex;
		gap: 8px;
		padding: 4px 12px;
	}

	.btn {
		padding: 6px 14px;
		border-radius: 6px;
		font-size: 13px;
		background: var(--bg2);
		color: #94abc0;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.06);
		transition: 0.2s;

		&:hover {
			color: #fff;
			background: var(--bg1);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.cf-status {
		margin: 8px 14px;
		font-size: 13px;
		padding: 6px 12px;
		border-radius: 6px;

		&.ok {
			background: rgba(0, 200, 0, 0.1);
			color: #4caf50;
		}
		&.err {
			background: rgba(255, 0, 0, 0.1);
			color: #f44336;
		}
	}

	.cf-lists {
		padding: 8px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;

		.label {
			font-size: 12px;
			color: #627079;
			padding-bottom: 4px;
		}
	}

	.list-item {
		display: flex;
		justify-content: space-between;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 13px;
		background: var(--bg1);
		color: #94abc0;
		cursor: pointer;
		border: 1px solid transparent;
		transition: 0.2s;
		text-align: left;

		&:hover {
			border-color: rgba(255, 255, 255, 0.1);
			color: #fff;
		}
		&.sel {
			background: rgba(28, 147, 255, 0.12);
			border-color: #1c93ff;
			color: #1c93ff;
		}

		.count {
			font-size: 11px;
			color: #627079;
		}
	}
</style>

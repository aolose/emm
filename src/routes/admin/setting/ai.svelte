<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';
	import Tags from '$lib/components/tags.svelte';
	import MemoryProfile from './MemoryProfile.svelte';
	import { sys } from './sys';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import { getErr, trim } from '$lib/utils';
	import { req } from '$lib/req';
	import { aiStatus, validateAi } from '$lib/components/ai';
	import { get } from 'svelte/store';

	let apiKey = $state('');
	let model = $state('');
	let memoryEnabled = $state(false);
	let memoryInitialized = $state(false);
	let memoryId = $state('');
	let memoryLastUpdated = $state<number | null>(null);
	let memoryLearning = $state(false);
	let memoryPersona = $state<{ role: string; tone: string; readers: string } | null>(null);
	let memoryPersona_zh = $state<{ role: string; tone: string; readers: string } | null>(null);
	let memoryStyle = $state<{ language: string; preferences: string[]; avoid: string[] } | null>(
		null
	);
	let memoryStyle_zh = $state<{ language: string; preferences: string[]; avoid: string[] } | null>(null);
	let memoryKnowledge = $state<string[]>([]);
	let memoryKnowledge_zh = $state<string[]>([]);
	let memoryTags = $state('');
	let availableTags = $state<string[]>([]);
	let memoryLimit = $state(10);
	let regenerating = $state(false);
	let balance = $state<{
		is_available: boolean;
		balance_infos?: Array<{
			currency: string;
			total_balance: string;
			granted_balance: string;
			topped_up_balance: string;
		}>;
	} | null>(null);
	let fetchingBalance = $state(false);
	let msg = $state('');
	let ld = $state(false);
	let err = $state(0);
	let act = $state(0);
	let validating = $state(false);

	// ── Memory polling — auto-detect when AI finishes learning ──────
	// Tracks the lastUpdated before learning started, so polling can detect
	// when the background task writes NEW data (not the stale old data).
	let memoryLearningBaseline = $state<number | null>(null);
	let memoryPollTimer: ReturnType<typeof setInterval> | null = null;

	function startMemoryPolling() {
		if (memoryPollTimer) return;
		memoryPollTimer = setInterval(async () => {
			await checkMemoryStatus();
			if (memoryInitialized && memoryLastUpdated !== memoryLearningBaseline) {
				stopMemoryPolling();
				memoryLearning = false;
				act = 1;
				err = 0;
				msg = 'Memory learned.';
				memoryLearningBaseline = null;
			}
		}, 3000);
	}

	function stopMemoryPolling() {
		if (memoryPollTimer) {
			clearInterval(memoryPollTimer);
			memoryPollTimer = null;
		}
	}

	// Poll only while learning is in progress (Learn button was clicked)
	$effect(() => {
		if (memoryLearning) {
			startMemoryPolling();
		} else {
			stopMemoryPolling();
		}
	});

	onDestroy(() => stopMemoryPolling());

	onMount(() =>
		sys.subscribe((a) => {
			apiKey = a.aiApiKey || '';
			model = a.aiModel || '';
			memoryEnabled = !!a.aiMemoryEnabled;
			memoryTags = a.aiMemoryTags || '';
			memoryLimit = (a.aiMemoryLimit as number) || 10;
			checkMemoryStatus();
			fetchBalance();
			fetchTags();
			validateAi();
		})
	);

	async function checkMemoryStatus(): Promise<boolean> {
		try {
			const data = (await req('aiMemory', undefined, { method: 1 as never })) as {
				initialized: boolean;
				memory: {
					memoryId?: string;
					lastUpdated: number | null;
					persona?: { role: string; tone: string; readers: string } | null;
					persona_zh?: { role: string; tone: string; readers: string } | null;
					style?: { language: string; preferences: string[]; avoid: string[] } | null;
					style_zh?: { language: string; preferences: string[]; avoid: string[] } | null;
					knowledge?: string[];
					knowledge_zh?: string[];
				};
			};
			memoryInitialized = !!data?.initialized;
			memoryId = (data?.memory?.memoryId as string) || '';
			memoryLastUpdated = data?.memory?.lastUpdated ?? null;
			memoryPersona = data?.memory?.persona || null;
			memoryPersona_zh = data?.memory?.persona_zh || null;
			memoryStyle = data?.memory?.style || null;
			memoryStyle_zh = data?.memory?.style_zh || null;
			memoryKnowledge = data?.memory?.knowledge || [];
			memoryKnowledge_zh = data?.memory?.knowledge_zh || [];
			return memoryInitialized;
		} catch {
			memoryInitialized = false;
			memoryId = '';
			memoryLastUpdated = null;
			memoryPersona = null;
			memoryPersona_zh = null;
			memoryStyle = null;
			memoryStyle_zh = null;
			memoryKnowledge = [];
			memoryKnowledge_zh = [];
			return false;
		}
	}

	async function fetchBalance() {
		fetchingBalance = true;
		try {
			const data = (await req('aiBalance', undefined, { method: 1 as never })) as typeof balance;
			balance = data;
		} catch {
			balance = null;
		} finally {
			fetchingBalance = false;
		}
	}

	async function learnMemory() {
		if (memoryLearning || regenerating) return;
		memoryLearning = true;
		// Capture current timestamp so polling can detect when new data arrives
		memoryLearningBaseline = memoryLastUpdated;
		try {
			await req('aiMemoryLearn', undefined, { method: 0 as never });
			// Returns immediately: { ok: true, learning: true }
			// Polling will detect completion and update status
		} catch (e) {
			memoryLearning = false;
			act = 1;
			err = 1;
			msg = getErr(e as Error);
		}
	}

	async function clearMemory() {
		if (memoryLearning || regenerating) return;
		regenerating = true;
		try {
			await req(
				'aiMemory',
				{ memory: { persona: {}, style: {}, knowledge: [] } },
				{ method: 2 as never }
			);
			act = 1;
			err = 0;
			msg = 'Memory cleared.';
			memoryInitialized = false;
			memoryId = '';
			memoryLastUpdated = null;
			memoryPersona = null;
			memoryPersona_zh = null;
			memoryStyle = null;
			memoryStyle_zh = null;
			memoryKnowledge = [];
			memoryKnowledge_zh = [];
		} catch (e) {
			act = 1;
			err = 1;
			msg = getErr(e as Error);
		} finally {
			regenerating = false;
		}
	}

	async function fetchTags() {
		try {
			const data = (await req('tagLS', undefined, { method: 0 as never })) as Array<{
				name: string;
			}>;
			if (Array.isArray(data)) {
				availableTags = data.map((t) => t.name);
			} else {
				availableTags = [];
			}
		} catch {
			availableTags = [];
		}
	}

	const save = async () => {
		ld = true;
		const o = {
			aiApiKey: trim(apiKey),
			aiModel: trim(model),
			aiMemoryEnabled: memoryEnabled,
			aiMemoryTags: memoryTags,
			aiMemoryLimit: memoryLimit
		};
		try {
			await req('sys', o);
			act = 1;
			err = 0;
			msg = 'Saved.';
			sys.update((a) => ({ ...a, ...o }));
			if (memoryEnabled) await checkMemoryStatus();
			validating = true;
			aiStatus.set('checking');
			await validateAi();
		} catch (e) {
			act = 1;
			err = 1;
			msg = getErr(e as Error);
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
			case 'checking':
				return 'Checking...';
			case 'available':
				return 'Connected';
			case 'no_key':
				return 'No API key';
			case 'invalid':
				return 'Invalid key';
			case 'error':
				return 'Error';
			default:
				return 'Unknown';
		}
	}
</script>

<Card {act} {msg} {err} title="AI Integration" {save} {ld}>
	<!-- 输入框部分保持通用组件封装 -->
	<div class="ipt-container">
		<Ipt label="API Key" bind:value={apiKey} password placeholder="sk-..." />
		<Ipt label="Model" bind:value={model} placeholder="empty = auto (V4 Pro)" />
	</div>

	<!-- 状态检测行 -->
	<div class="status-row">
		<span class="status-label">Status</span>
		<div class="status-wrapper">
			<span
				class="status-value"
				class:available={$aiStatus === 'available'}
				class:error={$aiStatus !== 'available' && $aiStatus !== 'checking'}
			>
				{statusLabel($aiStatus)}
			</span>
			<button class="validate-btn" onclick={validate} disabled={validating || !apiKey.trim()}>
				{validating ? 'Checking...' : 'Test Connection'}
			</button>
		</div>
	</div>

	<!-- 余额显示行 -->
	{#if $aiStatus === 'available'}
		<div class="status-row">
			<span class="status-label">Balance</span>
			<div class="status-wrapper">
				{#if balance}
					<div class="balance-value">
						{#each balance.balance_infos ?? [] as bi}
							<span class="balance-currency">{bi.currency}</span>
							<span class="balance-total">{bi.total_balance}</span>
							<span class="balance-detail">(+{bi.granted_balance} granted)</span>
						{/each}
					</div>
					<button
						class="validate-btn bal-refresh"
						onclick={fetchBalance}
						disabled={fetchingBalance}
					>
						{fetchingBalance ? '...' : '↻'}
					</button>
				{:else}
					<span class="status-value error">—</span>
					<button
						class="validate-btn bal-refresh"
						onclick={fetchBalance}
						disabled={fetchingBalance}
					>
						{fetchingBalance ? '...' : 'Check'}
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- 记忆库开关行 -->
	<div class="status-row">
		<span class="status-label">Memory</span>
		<div class="status-wrapper">
			<Switch bind:checked={memoryEnabled}>
				<span class="switch-tip">
					{#if memoryEnabled}
						{memoryInitialized ? 'Active' : 'Enabled'}
					{:else}
						Disabled
					{/if}
				</span>
			</Switch>
		</div>
	</div>

	<!-- 记忆库状态行 -->
	{#if memoryEnabled}
		<div class="status-row memory-status-row">
			<span class="status-label">Status</span>
			<span class="memory-status-value">
				{#if memoryLearning}
					Learning...
				{:else if memoryInitialized}
					Learned
				{:else}
					Not learned
				{/if}
			</span>
			{#if memoryInitialized && memoryLastUpdated}
				<span class="memory-status-date">{new Date(memoryLastUpdated).toLocaleDateString()}</span>
			{/if}
		</div>

		<!-- 记忆画像 -->
		<MemoryProfile
			memoryId={memoryId}
			persona={memoryPersona}
			persona_zh={memoryPersona_zh}
			style={memoryStyle}
			style_zh={memoryStyle_zh}
			knowledge={memoryKnowledge}
			knowledge_zh={memoryKnowledge_zh}
		/>

		<!-- 记忆库高级配置行 -->
		<div class="status-row memory-config-row">
			<span class="status-label">Memory Config</span>
			<div class="config-inputs-group">
				<label class="input-with-label">
					<Tags tags={availableTags} bind:value={memoryTags} />
				</label>
				<div>
					<span class="limit-label">Limit</span>
					<input class="limit-input" type="number" bind:value={memoryLimit} min="1" max="50" />
					{#if !memoryLearning}
						<button class="learn-btn" onclick={learnMemory} disabled={regenerating}>
							{memoryInitialized ? 'Relearn' : 'Learn Now'}
						</button>
					{:else}
						<button class="learn-btn" disabled> Learning... </button>
					{/if}
					{#if memoryInitialized}
						<button class="clear-btn" onclick={clearMemory} disabled={regenerating || memoryLearning}>
							{regenerating ? 'Clearing...' : 'Clear'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</Card>

<style lang="scss">
	@use '../../../lib/break' as *;

	// 基础变量定义，方便统一视觉风格
	$radius-sm: 6px;
	$radius-md: 8px;
	$transition-base: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

	// 颜色面板（暗色系调优）
	$color-text-muted: #718096;
	$color-text-main: #c8d3ee;
	$color-border-subtle: rgba(255, 255, 255, 0.06);
	$color-bg-input: rgba(255, 255, 255, 0.03);
	$color-focus-blue: #4080ff;

	button {
		min-height: 48px;
		height: 48px;
		flex-shrink: 0;
		min-width: 0 !important;
	}

	.ipt-container {
		display: flex;
		flex-direction: column;
	}

	.status-row {
		min-height: 52px;
		font-size: 14px;
		display: flex;
		padding: 4px 30px;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		box-sizing: border-box;

		@include s() {
			flex-direction: column;
			align-items: flex-start;
			padding: 14px;
			gap: 10px;
		}
	}

	:global(.status-label) {
		flex-shrink: 0;
		width: 110px;
		font-weight: 500;
		font-size: 13px;
		letter-spacing: 0.3px;

		@include s() {
			width: 100%;
		}
	}

	.memory-status-row {
		padding-top: 0;
		padding-bottom: 4px;
	}

	.memory-status-value {
		text-align: right;
		font-size: 13px;
		color: #10b981;
		flex: 1;
	}

	.memory-status-date {
		font-size: 12px;
		color: #6a7a8e;
		white-space: nowrap;
	}

	.status-wrapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		flex-grow: 1;
		gap: 12px;
		width: auto;

		@include s() {
			width: 100%;
			justify-content: space-between;
		}
	}

	.status-value {
		font-size: 12px;
		padding: 4px 10px;
		border-radius: $radius-sm;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		letter-spacing: 0.3px;

		&.available {
			color: #34d399;
		}

		&.error {
			color: #f87171;
		}
	}

	.switch-tip {
		font-size: 12px;
		color: $color-text-muted;
		margin-left: 8px;
	}

	.config-inputs-group {
		flex-wrap: wrap;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-grow: 1;
		width: 100%;

		.flex-grow {
			flex-grow: 1;
		}

		.shrink-0 {
			flex-shrink: 0;
		}

		@include s() {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}
	}

	.input-with-label {
		max-width: 280px;
		background: $color-bg-input;
		border-radius: $radius-sm;
		min-height: 40px;
		padding: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.limit-label {
		font-size: 12px;
		color: #718096;
		white-space: nowrap;
	}

	// 统一输入框样式
	.limit-input {
		flex-shrink: 0;
		flex-grow: 0;
		background: $color-bg-input;
		border-radius: $radius-sm;
		color: $color-text-main;
		font-size: 13px;
		padding: 7px 12px;
		outline: none;
		transition: $transition-base;
		box-sizing: border-box;
		width: 58px;
		text-align: center;
		-moz-appearance: textfield;

		&::-webkit-inner-spin-button,
		&::-webkit-outer-spin-button {
			-webkit-appearance: none;
			margin: 0;
		}

		&:hover:not(:disabled) {
			border-color: rgba(255, 255, 255, 0.15);
			background: rgba(255, 255, 255, 0.05);
		}

		&:focus {
			border-color: $color-focus-blue;
			background: rgba(0, 0, 0, 0.2);
		}
	}

	// Tags component — placeholder styling handled by component itself
	// 按钮统一样式
	.validate-btn,
	.clear-btn {
		padding: 7px 14px;
		border-radius: $radius-sm;
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		transition: $transition-base;
		font-weight: 500;
		box-sizing: border-box;
	}

	.validate-btn {
		border: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(255, 255, 255, 0.04);
		color: #e2e8f0;

		&:hover:not(:disabled) {
			background: rgba(255, 255, 255, 0.1);
			border-color: rgba(255, 255, 255, 0.2);
			color: #ffffff;
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}

		@include s() {
			width: 100%;
			text-align: center;
		}
	}

	.learn-btn {
		border: 1px solid rgba(64, 160, 100, 0.25);
		background: rgba(64, 160, 100, 0.1);
		color: #8fc9a0;

		&:hover:not(:disabled) {
			background: rgba(64, 160, 100, 0.2);
			border-color: rgba(64, 160, 100, 0.4);
			color: #a8e0b8;
		}
		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
			border-color: $color-border-subtle;
			background: $color-bg-input;
			color: $color-text-muted;
		}

		@include s() {
			width: 100%;
			text-align: center;
		}
	}

	.clear-btn {
		border: 1px solid rgba(239, 68, 68, 0.15);
		background: rgba(239, 68, 68, 0.05);
		color: #f87171;

		&:hover:not(:disabled) {
			background: rgba(239, 68, 68, 0.12);
			border-color: rgba(239, 68, 68, 0.3);
			color: #fca5a5;
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
			border-color: $color-border-subtle;
			background: $color-bg-input;
			color: $color-text-muted;
		}

		@include s() {
			width: 100%;
			text-align: center;
		}
	}

	// 余额相关样式
	.balance-value {
		display: flex;
		align-items: center;
		gap: 6px;
		color: $color-text-main;
		span{
      line-height: 1;
      font-size: 12px;
		}
	}

	.balance-currency {
		color: $color-text-muted;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.balance-total {
		color: #fff;
	}

	.balance-detail {
		color: #4a5568;
		font-size: 11px;
	}

	.bal-refresh {
		background: none;
		border: none;
		padding: 4px 10px;
		font-size: 12px;

		@include s() {
			width: auto;
		}
	}
</style>
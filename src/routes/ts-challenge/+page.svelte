<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let { data } = $props();
	const { redirect, siteKey } = data;

	let status = $state('loading');
	let errorMsg = $state('');

	function loadTurnstileScript() {
		return new Promise((resolve, reject) => {
			if (window.turnstile) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.defer = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Turnstile'));
			document.head.appendChild(script);
		});
	}

	async function verify(token) {
		status = 'verifying';
		try {
			const res = await fetch('/api/tsVerify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			});
			const body = await res.json();
			if (body.success) {
				status = 'success';
				setTimeout(() => {
					window.location.href = redirect;
				}, 800);
			} else {
				status = 'error';
				errorMsg = body.error || 'Verification failed. Please try again.';
			}
		} catch (e) {
			status = 'error';
			errorMsg = 'Network error. Please try again.';
		}
	}

	onMount(async () => {
		// Treat empty or default '-' as not configured
		if (!siteKey || siteKey === '-') {
			status = 'error';
			errorMsg = 'Turnstile is not configured. Please contact the site administrator.';
			return;
		}

		try {
			await loadTurnstileScript();
		} catch (_e) {
			status = 'error';
			errorMsg = 'Failed to load verification service. Please check your network.';
			return;
		}

		await new Promise((r) => setTimeout(r, 100));

		if (!window.turnstile) {
			status = 'error';
			errorMsg = 'Turnstile service unavailable.';
			return;
		}

		const container = document.getElementById('ts-widget');
		if (!container) return;

		try {
			window.turnstile.render(container, {
				sitekey: siteKey,
				callback: verify,
				'error-callback': () => {
					status = 'error';
					errorMsg = 'Verification error. Please refresh the page.';
				},
				'expired-callback': () => {
					status = 'error';
					errorMsg = 'Verification expired. Please refresh the page.';
				},
				theme: 'auto',
			});
		} catch (e) {
			status = 'error';
			errorMsg = 'Failed to start verification. Please refresh.';
		}
	});
</script>

<div class="g" transition:fade|global>
	<div class="bg"></div>
	<div class="cc">
		<div class="bx">
			<div class="icon">
				{#if status === 'loading' || status === 'verifying'}
					<span class="spinner"></span>
				{:else if status === 'success'}
					<span class="checkmark">&#10003;</span>
				{:else}
					<span class="cross">&#10007;</span>
				{/if}
			</div>
			<h1>
				{#if status === 'loading'}
					Loading verification...
				{:else if status === 'verifying'}
					Verifying...
				{:else if status === 'success'}
					Verified! Redirecting...
				{:else}
					Verification required
				{/if}
			</h1>
			{#if status === 'error'}
				<p class="err">{errorMsg}</p>
				<button onclick={() => window.location.reload()}>Retry</button>
			{/if}
			<div id="ts-widget"></div>
		</div>
	</div>
</div>

<style lang="scss">
	.g,
	.bg {
		width: 100%;
		height: 100%;
		position: fixed;
		top: 0;
		left: 0;
		z-index: 9999;
	}

	.bg {
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
	}

	.cc {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	}

	.bx {
		background: rgba(30, 30, 40, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 40px;
		text-align: center;
		max-width: 400px;
		width: 90%;
		color: #ccc;

		h1 {
			font-size: 20px;
			font-weight: 300;
			margin: 16px 0;
			color: #fff;
		}

		.icon {
			font-size: 40px;
			margin-bottom: 8px;
		}
	}

	.spinner {
		display: inline-block;
		width: 36px;
		height: 36px;
		border: 3px solid rgba(255, 255, 255, 0.15);
		border-top-color: #477dc1;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.checkmark {
		color: #16b005;
		font-size: 48px;
	}

	.cross {
		color: #ff3b30;
		font-size: 48px;
	}

	.err {
		color: #d39090;
		margin: 12px 0;
		font-size: 14px;
	}

	button {
		background: #477dc1;
		color: #fff;
		border: none;
		border-radius: 6px;
		padding: 8px 24px;
		font-size: 16px;
		cursor: pointer;
		margin-top: 8px;

		&:hover {
			background: #5a90d4;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
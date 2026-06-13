<script>
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	let { data } = $props();
	const { redirect, siteKey } = data;

	let status = $state('loading'); // 'loading' | 'verifying' | 'success' | 'error'
	let errorMsg = $state('');

	function loadTurnstileScript() {
		return new Promise((resolve, reject) => {
			if (window.turnstile) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
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
				body: JSON.stringify({ token })
			});
			const body = await res.json();
			if (body.success) {
				status = 'success';
				setTimeout(() => {
					window.location.href = redirect;
				}, 200);
			} else {
				status = 'error';
				errorMsg = body.error || 'Verification failed. Please try again.';
			}
		} catch (e) {
			console.warn(`Failed to verify token: ${e}`);
			status = 'error';
			errorMsg = 'Network error. Please try again.';
		}
	}

	function handleRetry() {
		window.location.reload()
	}

	async function initTurnstile() {
		if (!siteKey || siteKey === '-') {
			status = 'error';
			errorMsg = 'Turnstile is not configured. Please contact the site administrator.';
			return;
		}

		try {
			await loadTurnstileScript();
		} catch (_e) {
			console.warn(`Failed to load Turnstile: ${_e.message}`);
			status = 'error';
			errorMsg = 'Failed to load security protocols.';
			return;
		}

		if (!window.turnstile) {
			await new Promise((r) => setTimeout(r, 200));
		}

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
					errorMsg = 'Verification error.';
				},
				'expired-callback': () => {
					status = 'error';
					errorMsg = 'Verification expired.';
				},
				appearance:"interaction-only",
				theme: 'dark',
				size: 'compact'
			});
		} catch (e) {
			console.warn(e)
			status = 'error';
			errorMsg = 'Failed to start verification.';
		}
	}
	onMount(() => {
		initTurnstile();
	});
</script>

<div class="art-overlay" transition:fade={{ duration: 400 }}>
	<div class="glow-orb orb-1"></div>
	<div class="glow-orb orb-2"></div>
	<div class="mesh-grid"></div>
	<div class="frame-container">
		<div class="art-card">
			<div class="text-group">
				<p class="subtitle-tag">GATEWAY SECURITY</p>
				<h2>
					{#if status === 'loading'}
						Preparing Environment
					{:else if status === 'verifying'}
						Analyzing Credentials
					{:else if status === 'success'}
						Access Granted
					{:else}
						Verification Suspended
					{/if}
				</h2>
			</div>
			<div class="art-canvas-square">
				<div
					id="ts-widget"
					class="absolute-layer"
					class:visible={status === 'loading' || status === 'verifying'}
					class:pointer-none={status === 'success' || status === 'error'}
				></div>
				{#if status === 'loading'}
					<div class="absolute-layer flex-center" transition:fade={{ duration: 250 }}>
						<div class="cosmic-loader">
							<div class="ring core"></div>
							<div class="ring satellite"></div>
						</div>
					</div>
				{:else if status === 'verifying'}
					<div class="absolute-layer flex-center" transition:fade={{ duration: 250 }}>
						<div class="pulse-matrix" in:scale={{ duration: 300, start: 0.8 }}>
							<div class="wave"></div>
							<div class="wave delay-1"></div>
							<svg class="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
							</svg>
						</div>
					</div>
				{/if}
				{#if status === 'success'}
					<div class="absolute-layer flex-center" in:scale={{ duration: 400, start: 0.9 }}>
						<div class="art-icon success">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</div>
					</div>
				{/if}
				{#if status === 'error'}
					<div class="absolute-layer flex-center-column error-layout" transition:fade={{ duration: 200 }}>
						<div class="art-icon error">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
						</div>
						<p class="error-text">{errorMsg}</p>
						<button class="action-btn" onclick={handleRetry}>
							<span>Retry Connection</span>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
							</svg>
						</button>
					</div>
				{/if}

			</div>

			<div class="brand-footer">
				<span>Protected by Cloudflare Turnstile</span>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
  .art-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background-color: #050508;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    opacity: 0.15;
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, #3b99f6, #1a6b97);
    top: -5%;
    left: -5%;
  }

  .orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #4895ec, #1e0f7e);
    bottom: -10%;
    right: -10%;
  }

  .mesh-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
  }

  .frame-container {
    width: 100%;
    max-width: 320px;
    padding: 20px;
    z-index: 10;
  }

  .art-card {
    background: linear-gradient(135deg, rgba(20, 20, 28, 0.75), rgba(10, 10, 15, 0.85));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgb(59 76 129 / 0.36);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
    border-radius: 16px;
    padding: 32px 16px 16px;
    text-align: center;
  }

  .text-group {
    margin-bottom: 24px;

    .subtitle-tag {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: rgba(255, 255, 255, 0.4);
      margin: 0 0 6px 0;
    }

    h2 {
      font-size: 19px;
      font-weight: 400;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.01em;
    }
  }

  .art-canvas-square {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgb(90 132 202 / 0.1);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .absolute-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flex-center-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .pointer-none {
    pointer-events: none;
  }

  #ts-widget {
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transform: scale(0.96);
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 1;

    &.visible {
      opacity: 1;
      transform: scale(1);
    }
  }

  .error-layout {
    padding: 24px;
    z-index: 2;
    background: rgba(14, 14, 20, 0.4);

    .error-text {
			white-space: pre-wrap;
      color: rgb(180 200 255 / 0.9);
      font-size: 12px;
      line-height: 1.5;
      margin: 12px 0 16px 0;
      max-width: 220px;
    }
  }
  .cosmic-loader {
    position: relative;
    width: 46px;
    height: 46px;

    .ring {
      position: absolute;
      inset: 0;
      border: 2px solid transparent;
      border-radius: 50%;
    }

    .core {
      border-top-color: rgba(255, 255, 255, 0.8);
      border-bottom-color: rgba(255, 255, 255, 0.1);
      animation: spin-cw 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .satellite {
      inset: -6px;
      border-left-color: #3b82f6;
      border-right-color: rgba(139, 92, 246, 0.2);
      animation: spin-ccw 1.6s linear infinite;
    }
  }

  .pulse-matrix {
    position: relative;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a78bfa;

    .shield-icon {
      width: 24px;
      height: 24px;
      z-index: 2;
    }

    .wave {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 1px solid rgba(167, 139, 250, 0.3);
      border-radius: 50%;
      animation: pulse-ring 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
    }

    .delay-1 {
      animation-delay: 0.9s;
    }
  }

  .art-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 22px;
      height: 22px;
    }

    &.success {
      color: #34d399;
      background: radial-gradient(circle, rgba(52, 211, 153, 0.12) 0%, transparent 80%);
      border: 1px solid rgba(52, 211, 153, 0.15);
    }

    &.error {
      color: #287dff;
      background: radial-gradient(circle, rgb(113 237 248 / 0.12) 0%, transparent 80%);
      border: 1px solid rgb(113 156 248 / 0.2);
    }
  }

  /* Action Core Button Setup */
  .action-btn {
    background: #ffffff;
    color: #050508;
    border: none;
    border-radius: 12px;
    padding: 10px 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 8px 20px rgba(255, 255, 255, 0.08);

    svg {
      width: 12px;
      height: 12px;
      transition: transform 0.4s ease;
    }

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 24px rgba(255, 255, 255, 0.12);

      svg {
        transform: rotate(180deg);
      }
    }

    &:active {
      transform: translateY(0);
    }
  }

  .brand-footer {
    margin-top: 28px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.2);
  }

  // Core Loop Machinery
  @keyframes spin-cw {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes spin-ccw {
    to {
      transform: rotate(-360deg);
    }
  }

  @keyframes pulse-ring {
    0% {
      transform: scale(0.6);
      opacity: 1;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
  }
</style>
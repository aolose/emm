<script lang="ts">
	// Import Svelte's built-in transition functions
	import { fade, fly } from 'svelte/transition';

	let {
		memoryId = '',
		persona = null,
		persona_zh = null,
		style = null,
		style_zh = null,
		knowledge = [],
		knowledge_zh = []
	}: {
		memoryId?: string;
		persona?: { role: string; tone: string; readers: string } | null;
		persona_zh?: { role: string; tone: string; readers: string } | null;
		style?: { language: string; preferences: string[]; avoid: string[] } | null;
		style_zh?: { language: string; preferences: string[]; avoid: string[] } | null;
		knowledge?: string[];
		knowledge_zh?: string[];
	} = $props();

	let expanded = $state(false);
	let lang = $state<'zh' | 'en'>('en');

	/**
	 * Pick the value for the current language from a possibly-bilingual field.
	 * Falls back to the default (en) field when _zh is missing.
	 */
	function t<T>(enVal: T, zhVal?: T): T {
		if (lang === 'zh' && zhVal !== undefined && zhVal !== null) return zhVal;
		return enVal;
	}

	// Resolved per-language values
	const p = $derived(t(persona, persona_zh));
	const s = $derived(t(style, style_zh));
	const k = $derived(t(knowledge, knowledge_zh));

	// Prevent background body from scrolling when modal is active
	$effect(() => {
		if (expanded) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

{#if persona}
	<!-- Trigger button remain untouched as requested -->
	<div class="memory-profile-toggle status-row" onclick={() => (expanded = !expanded)}>
		<span class="status-label">Profile ID</span>
		<span class="profile-summary">{persona.role || '—'}</span>
		<span class="profile-arrow">{expanded ? '▾' : '▸'}</span>
	</div>

	{#if expanded}
		<!-- 1. FULL BODY MASK LAYER (Fades smoothly in/out) -->
		<div
			class="id-card-modal-backdrop"
			transition:fade={{ duration: 250 }}
			onclick={() => (expanded = false)}
		>
			<!-- 2. THE ID CARD CONTAINER (Slides upwards smoothly from bottom) -->
			<!-- stopPropagation stops clicking the card from closing the modal -->
			<div
				class="id-card-container"
				transition:fly={{ y: 50, duration: 350 }}
				onclick={(e) => e.stopPropagation()}
			>
				<div class="id-card-glow"></div>
				<div class="memory-profile-card" class:lang-en={lang === 'en'} class:lang-zh={lang === 'zh'}>

					<!-- Close Action Hint for mobile users -->
					<button class="modal-close-btn" onclick={() => (expanded = false)}></button>

					<!-- Card Header -->
					<div class="card-header">
						<div class="header-brand">
							<span class="brand-dot"></span>
							<span class="card-title">AI MEMORY PROFILE</span>
						</div>
						<div class="lang-toggle">
							<button
								class="lang-btn"
								class:active={lang === 'en'}
								onclick={() => (lang = 'en')}
							>EN</button><span>/</span>
							<button
								class="lang-btn"
								class:active={lang === 'zh'}
								onclick={() => (lang = 'zh')}
							>ZH</button>
						</div>
					</div>

					<!-- Scrollable Content Wrapper inside the Portrait Screen Card -->
					<div class="card-viewport">
						<!-- Card Body -->
						<div class="card-body-vertical">
							<div class="profile-meta-row">
								<div class="card-photo-area">
									<div class="avatar-placeholder">
										<svg class="avatar-icon" viewBox="0 0 24 24" fill="currentColor">
											<path
												d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5-4-8-4z" />
										</svg>
										<div class="scan-line"></div>
									</div>
								</div>

								<div class="profile-main-title">
									<div class="field-mini-label">{lang === 'zh' ? '身份 / 角色' : 'IDENTITY / ROLE'}</div>
									<div class="role-text-highlight">{p?.role || (lang === 'zh' ? '未知' : 'UNKNOWN')}</div>
									<span class="card-serial">SYS-ID: {memoryId || '404-NX'}</span>
								</div>
							</div>

							<!-- Info Grid -->
							<div class="card-info-grid">
								<div class="profile-field-block">
									<span class="id-label">{lang === 'zh' ? '语气' : 'TONE'}</span>
									<span class="id-value">{p?.tone || '—'}</span>
								</div>
								<div class="profile-field-block">
									<span class="id-label">{lang === 'zh' ? '读者' : 'READERS'}</span>
									<span class="id-value">{p?.readers || '—'}</span>
								</div>

								{#if s}
									<div class="profile-field-block">
										<span class="id-label">{lang === 'zh' ? '语言' : 'LANG'}</span>
										<span class="id-value">{s.language || '—'}</span>
									</div>

									{#if s.preferences?.length}
										<div class="profile-field-block full-width">
											<span class="id-label pref">{lang === 'zh' ? '偏好' : 'PREF'}</span>
											<span class="id-value line-height-relaxed">{s.preferences.join(lang === 'zh' ? '，' : ', ')}</span>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<!-- Card Footer / Long lists -->
						{#if (s && s.avoid?.length) || k.length}
							<div class="card-footer">
								{#if s && s.avoid?.length}
									<div class="footer-meta-block avoid-box">
										<span class="id-label">{lang === 'zh' ? '规避控制' : 'AVOID CONTROL'}</span>
										<div class="avoid-tags">
											{#each s.avoid as av}
												<span class="avoid-tag">{av}</span>
											{/each}
										</div>
									</div>
								{/if}

								{#if k.length}
									<div class="footer-meta-block">
										<span class="id-label text-dim">{lang === 'zh' ? '知识库' : 'KNOWLEDGE BASE'} ({k.length})</span>
										<ul class="profile-list">
											{#each k as item (item)}
												<li>
													<span class="list-indicator">&gt;</span>
													<span class="list-content">{item}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Barcode Decoration Area -->
								<div class="barcode-area">
									<div class="barcode-deco"></div>
									<div class="barcode-text">{memoryId || '404-NX'}-MEMORY-VERIFIED</div>
								</div>
							</div>
						{/if}
					</div>

				</div>
			</div>
		</div>
	{/if}
{/if}

<style lang="scss">
	@use '../../../lib/break' as *;

	.memory-profile-toggle {
		cursor: pointer;
		min-height: 52px;
		flex-wrap: wrap;
		font-size: 14px;
		display: flex;
		padding: 14px 30px;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		box-sizing: border-box;
		color: #a4b3cc;
		@include s() {
			padding: 10px;
		}
	}

	.profile-summary {
		flex: 1;
		font-size: 13px;
		color: #61738f;
		font-family: monospace;
	}

	// NEW: Full body screen gradient backdrop cover
	.id-card-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		box-sizing: border-box;
	}

	.id-card-container {
		position: relative;
		border-radius: 16px;
		padding: 1px;
		width: 100%;
		max-width: 380px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5),
			0 20px 50px rgba(0, 0, 0, 0.5);
	}

	.memory-profile-card {
		border: 1px solid rgb(31 109 255 / 0.2);
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
		max-height: 85vh;
		padding: 12px 16px;
		background: #000;
		border-radius: 11px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		position: relative;
		overflow: hidden;

		// English display: auto-capitalize tag-like values
		&.lang-en {
			.role-text-highlight { text-transform: capitalize; }
			.id-value { text-transform: capitalize; }
			.avoid-tag { text-transform: capitalize; }
		}
	}

	.modal-close-btn {
		z-index: 100;
		transition: .3s ease-in-out;
		position: absolute;
		padding: 0;
		top: 10px;
		right: 10px;
		width: 32px;
		height: 24px;
		background: linear-gradient(135deg, #cfc9bd 0%, #fffaee 50%, #958c72 100%) !important;
		border-radius: 4px;
		opacity: 0.3;
		box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);

		&:hover {
			opacity: .5;
		}
	}

	.card-viewport {
		flex: 1;
		overflow: hidden;
		padding-right: 4px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		padding-bottom: 12px;

		.header-brand {
			display: flex;
			align-items: center;
			gap: 6px;

			.brand-dot {
				width: 6px;
				height: 6px;
				background-color: #3b82f6;
				border-radius: 50%;
				box-shadow: 0 0 8px #3b82f6;
			}
		}

		.card-title {
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 1.5px;
			color: #3b82f6;
		}
	}

	.lang-toggle {
		margin-right: 32px;
		display: flex;
		align-items: center;
		overflow: hidden;
		span{
			color: #464a51;
			font-size: 10px;
			margin-right: -2px;
		}
	}

	.lang-btn {
		padding: 2px 4px;
		font-size: 12px;
		font-family: monospace;
		color: #414e60;
		background: transparent!important;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;

		&.active {
			color: #89a7cf;
		}

		&:hover {
			color: #fff;
		}
	}

	.card-serial {
		font-size: 10px;
		color: #4b5563;
		font-family: monospace;
		margin-right: 36px;
	}

	.card-body-vertical {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.profile-meta-row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.card-photo-area {
		.avatar-placeholder {
			width: 54px;
			height: 66px;
			background: #040507;
			border: 1px solid rgba(59, 130, 246, 0.15);
			border-radius: 6px;
			display: flex;
			align-items: center;
			justify-content: center;
			position: relative;
			overflow: hidden;

			.avatar-icon {
				opacity: 0.5;
				width: 38px;
				color: rgb(53 76 120 / 0.5);
			}

			.scan-line {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 2px;
				background: linear-gradient(90deg, transparent, #3b82f6, transparent);
				opacity: 0.25;
				animation: scan 3s linear infinite;
			}
		}
	}

	@keyframes scan {
		0% { top: 0%; }
		50% { top: 100%; }
		100% { top: 0%; }
	}

	.profile-main-title {
		flex: 1;
		height: 64px;
		.field-mini-label {
			font-size: 9px;
			color: #475569;
			font-weight: bold;
			letter-spacing: 0.5px;
			margin-bottom: 2px;
		}

		.role-text-highlight {
			font-size: 15px;
			font-weight: 600;
			color: #c1a450;
		}
	}

	.card-info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		background: rgb(1 255 14 / 0.01);
		padding: 10px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.07);

		.profile-field-block {
			display: flex;
			flex-direction: column;
			gap: 3px;

			&.full-width {
				grid-column: span 2;
				border-top: 1px dashed rgba(255, 255, 255, 0.04);
				padding-top: 8px;
			}

			.id-label {
				font-size: 9px;
				color: #3d4959;
				font-weight: bold;
			}

			.pref {
				color: #317037;
			}

			.id-value {
				font-size: 12px;
				color: #b2bfcc;
				word-break: break-all;

				&.line-height-relaxed {
					line-height: 1.4;
					color: #77b578;
				}
			}
		}
	}

	.card-footer {
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding-top: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;

		.footer-meta-block {
			display: flex;
			flex-direction: column;
			gap: 5px;

			.id-label {
				font-size: 9px;
				color: #64748b;
				font-weight: bold;

				&.text-dim {
					color: #475569;
				}
			}
		}

		.avoid-box {
			background: rgba(239, 68, 68, 0.01);
			border: 1px dashed rgba(239, 68, 68, 0.1);
			padding: 8px 10px;
			border-radius: 6px;

			.id-label {
				color: #ef4444 !important;
				opacity: 0.8;
			}
		}

		.avoid-tags {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;

			.avoid-tag {
				font-size: 11px;
				color: #fca5a5;
				padding: 1px 0;
				border-radius: 4px;
			}
		}
	}

	.profile-list {
		flex: 1;
		overflow-y: auto;
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;

		li {
			display: flex;
			align-items: center;
			gap: 6px;
			line-height: 1.4;
			opacity: .2;
			transition: opacity .3s ease-in-out;

			&:hover {
				opacity: 1;
			}

			span {
				color: #dae3ef;
			}

			.list-indicator {
				font-size: 7px;
				opacity: 0.6;
			}

			.list-content {
				font-size: 10px;
			}
		}
	}

	.barcode-area {
		margin-top: 4px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;

		.barcode-deco {
			opacity: 0.08;
			height: 20px;
			width: 100%;
			background: repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 2px, transparent 4px, #fff 2px, #fff 4px, transparent 4px, transparent 7px);
		}

		.barcode-text {
			font-size: 8px;
			color: #334155;
			font-family: monospace;
			letter-spacing: 1.5px;
		}
	}
</style>
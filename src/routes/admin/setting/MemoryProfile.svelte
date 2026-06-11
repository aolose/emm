<script lang="ts">
	// Import Svelte's built-in transition functions
	import { fade, fly } from 'svelte/transition';

	let {
		persona = null,
		style = null,
		knowledge = []
	}: {
		persona?: { role: string; tone: string; readers: string } | null;
		style?: { language: string; preferences: string[]; avoid: string[] } | null;
		knowledge?: string[];
	} = $props();

	let expanded = $state(false);

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
				<div class="memory-profile-card">

					<!-- Close Action Hint for mobile users -->
					<button class="modal-close-btn" onclick={() => (expanded = false)}></button>

					<!-- Card Header -->
					<div class="card-header">
						<div class="header-brand">
							<span class="brand-dot"></span>
							<span class="card-title">AI MEMORY PROFILE</span>
						</div>
						<span class="card-serial">SYS-ID: 404-NX</span>
					</div>

					<!-- Scrollable Content Wrapper inside the Portrait Screen Card -->
					<div class="card-viewport">
						<!-- Card Body -->
						<div class="card-body-vertical">
							<div class="profile-meta-row">
								<div class="card-photo-area">
									<div class="avatar-placeholder">
										<svg class="avatar-icon" viewBox="0 0 24 24" fill="currentColor">
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5-4-8-4z"/>
										</svg>
										<div class="scan-line"></div>
									</div>
								</div>

								<div class="profile-main-title">
									<div class="field-mini-label">IDENTITY / ROLE</div>
									<div class="role-text-highlight">{persona.role || 'UNKNOWN'}</div>
								</div>
							</div>

							<!-- Info Grid -->
							<div class="card-info-grid">
								<div class="profile-field-block">
									<span class="id-label">TONE</span>
									<span class="id-value">{persona.tone || '—'}</span>
								</div>
								<div class="profile-field-block">
									<span class="id-label">READERS</span>
									<span class="id-value">{persona.readers || '—'}</span>
								</div>

								{#if style}
									<div class="profile-field-block">
										<span class="id-label">LANG</span>
										<span class="id-value">{style.language || '—'}</span>
									</div>

									{#if style.preferences?.length}
										<div class="profile-field-block full-width">
											<span class="id-label pref">PREF</span>
											<span class="id-value line-height-relaxed">{style.preferences.join('，')}</span>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<!-- Card Footer / Long lists -->
						{#if (style && style.avoid?.length) || knowledge.length}
							<div class="card-footer">
								{#if style && style.avoid?.length}
									<div class="footer-meta-block avoid-box">
										<span class="id-label">AVOID CONTROL</span>
										<div class="avoid-tags">
											{#each style.avoid as av}
												<span class="avoid-tag">{av}</span>
											{/each}
										</div>
									</div>
								{/if}

								{#if knowledge.length}
									<div class="footer-meta-block">
										<span class="id-label text-dim">KNOWLEDGE BASE ({knowledge.length})</span>
										<ul class="profile-list">
											{#each knowledge as k (k)}
												<li>
													<span class="list-indicator">▪</span>
													<span class="list-content">{k}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Barcode Decoration Area -->
								<div class="barcode-area">
									<div class="barcode-deco"></div>
									<div class="barcode-text">404-NX-MEMORY-VERIFIED</div>
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
    background: rgba(0, 0, 0, 0.3); // Dark tint mask overlay
    backdrop-filter: blur(8px); // Premium glass frosted effect
    -webkit-backdrop-filter: blur(8px);
    z-index: 9999; // High priority stacking
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
    padding: 16px;
    background: #000;
    border-radius: 11px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
    overflow: hidden;
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
    background: linear-gradient(135deg, #cfc9bd 0%, #fffaee 50%, #958c72 100%)!important;
    border-radius: 4px;
    opacity: 0.3;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
		&:hover{
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

    .card-serial {
      font-size: 10px;
      color: #4b5563;
      font-family: monospace;
      margin-right: 36px;
    }
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
    0% {
      top: 0%;
    }
    50% {
      top: 100%;
    }
    100% {
      top: 0%;
    }
  }

  .profile-main-title {
    flex: 1;

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
			.pref{
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
      align-items: flex-start;
      gap: 6px;
      line-height: 1.4;

      .list-indicator {
        font-size: 7px;
        color: #3b82f6;
        margin-top: 4px;
        opacity: 0.6;
      }

      .list-content {
        font-size: 10px;
        color: #55657c;
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
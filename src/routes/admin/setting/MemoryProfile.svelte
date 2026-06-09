<script lang="ts">
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
</script>

{#if persona}
	<div class="memory-profile-toggle status-row" onclick={() => (expanded = !expanded)}>
		<span class="status-label">Profile ID</span>
		<span class="profile-summary">{persona.role || '—'}</span>
		<span class="profile-arrow">{expanded ? '▾' : '▸'}</span>
	</div>
	{#if expanded}
		<div class="id-card-container">
			<div class="id-card-glow"></div>
			<div class="memory-profile-card">
				<!-- 卡片头部：类似发证机关或卡片类型 -->
				<div class="card-header">
					<span class="card-title">AI MEMORY PROFILE</span>
					<span class="card-serial">SYSTEM-ID: 404-NX</span>
				</div>

				<!-- 卡片主体：左头像，右数据 -->
				<div class="card-body">
					<!-- 左侧：类似照片/头像区域 -->
					<div class="card-photo-area">
						<div class="avatar-placeholder">
							<span class="avatar-icon">👤</span>
						</div>
						<div class="photo-label">{persona.role || 'UNKNOWN'}</div>
					</div>

					<!-- 右侧：核心身份数据 -->
					<div class="card-info-area">
						<div class="profile-section">
							<div class="profile-field">
								<span class="id-label">ROLE:</span>{persona.role || '—'}
							</div>
							<div class="profile-field">
								<span class="id-label">TONE:</span>{persona.tone || '—'}
							</div>
							<div class="profile-field">
								<span class="id-label">READERS:</span>{persona.readers || '—'}
							</div>
						</div>

						{#if style}
							<div class="profile-section">
								<div class="profile-field">
									<span class="id-label">LANG:</span>{style.language || '—'}
								</div>
								{#if style.preferences?.length}
									<div class="profile-field">
										<span class="id-label">PREF:</span>{style.preferences.join(', ')}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- 底部：附加避讳词或长知识点，类似条形码/备注区 -->
				{#if (style && style.avoid?.length) || knowledge.length}
					<div class="card-footer">
						{#if style && style.avoid?.length}
							<div class="footer-meta text-danger">
								<span class="id-label">AVOID:</span>{style.avoid.join(' / ')}
							</div>
						{/if}
						{#if knowledge.length}
							<div class="footer-meta">
								<span class="id-label">KNOWLEDGE BASE:</span>
								<ul class="profile-list">
									{#each knowledge as k (k)}
										<li>{k}</li>
									{/each}
								</ul>
							</div>
						{/if}
						<!-- 假条形码装饰线 -->
						<div class="barcode-deco"></div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style lang="scss">
	@use '../../../lib/break' as *;
	.memory-profile-toggle {
		cursor: pointer;
		min-height: 52px;
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

	// 身份证外层包裹（用于做发光和圆角控制）
	.id-card-container {
		position: relative;
		margin: 0 30px 16px;
		border-radius: 12px;
		padding: 1px; // 留出微弱边框位置
	}

	// 实际身份证本体
	.memory-profile-card {
		padding: 16px;
		background: #08090b;
		border-radius: 11px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		position: relative;
		overflow: hidden;

		&::after {
			content: '';
			position: absolute;
			top: 16px;
			right: 16px;
			width: 32px;
			height: 24px;
			background: linear-gradient(135deg, #c5d1ce 0%, #f8fbfb 50%, #949597 100%);
			border-radius: 4px;
			opacity: 0.25; // 淡淡的金色芯片感
			box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
		}
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 8px;

		.card-title {
			font-size: 11px;
			font-weight: bold;
			letter-spacing: 2px;
			color: #3b82f6;
			font-family: 'Courier New', Courier, monospace;
		}
		.card-serial {
			font-size: 10px;
			color: #4b5563;
			font-family: monospace;
			margin-right: 45px; // 避开芯片位置
		}
	}

	.card-body {
		display: flex;
		gap: 16px;
	}

	.card-photo-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		width: 80px;

		.avatar-placeholder {
			width: 70px;
			height: 85px;
			background: #000;
			border: 1px solid rgba(255, 255, 255, 0.1);
			border-radius: 4px;
			display: flex;
			align-items: center;
			justify-content: center;

			.avatar-icon {
				font-size: 32px;
				opacity: 0.4;
			}
		}

		.photo-label {
			font-size: 10px;
			color: #4b5563;
			text-align: center;
			max-width: 80px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-family: monospace;
		}
	}

	// 右侧数据区
	.card-info-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		justify-content: center;
	}

	.profile-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	// 类似身份证的名值对样式
	.profile-field {
		display: flex;
		font-size: 12px;
		color: #e2e8f0;
		font-family: monospace;
		line-height: 1.6;

		.id-label {
			color: #64748b;
			font-weight: bold;
			display: inline-block;
			width: 70px;
		}
	}

	.card-footer {
		border-top: 1px dashed rgba(255, 255, 255, 0.08);
		padding-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;

		.footer-meta {
			font-size: 11px;
			color: #94a3b8;
			font-family: monospace;

			&.text-danger {
				color: #95772f;
			}

			.id-label {
				color: #475569;
				font-weight: bold;
				margin-right: 4px;
			}
		}
	}

	// 知识点列表微调
	.profile-list {
		list-style: none;
		padding: 0;
		margin: 4px 0 0 0;

		li {
			font-size: 11px;
			color: #97a2a6;
			line-height: 2;
			padding-left: 10px;
			position: relative;

			&::before {
				content: '>';
				position: absolute;
				left: 0;
				color: #475569;
			}
		}
	}

	.barcode-deco {
		margin-top: 12px;
		opacity: 0.08;
		height: 18px;
		width: 100%;
		background: repeating-linear-gradient(
			90deg,
			#fff,
			#fff 2px,
			transparent 4px,
			transparent 6px,
			#fff 4px,
			#fff 7px,
			transparent 7px,
			transparent 9px
		);
	}

	@media (max-width: 600px) {
		.id-card-container {
			margin: 0 14px 12px;
		}
		.card-body {
			gap: 12px;
		}
		.card-photo-area {
			width: 65px;
			.avatar-placeholder {
				width: 60px;
				height: 75px;
			}
		}
	}
</style>

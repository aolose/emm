/**
 * Shared Mermaid utilities — configuration, markup conversion, and client-side rendering.
 *
 * Used by viewer.svelte, AiPanel.svelte, and AiMessage.svelte to avoid
 * duplicating the init / config / regex logic.
 */

/** Shared mermaid configuration — every init path should use this. */
export const MERMAID_CONFIG = {
	startOnLoad: false,
	theme: 'base', // 必须设为 base 才能自定义颜色
	themeVariables: {
		darkMode: true, // 让底层逻辑知晓是深色模式
		background: '#12131a', // 画布的主背景（类似精美暗色 IDE 底色）
		canvasBackground: '#12131a', // 独立画布底色
		fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
		fontSize: '14px', // 整体字号

		// === 主节点样式 (Flowchart, Class, State 等等) ===
		primaryColor: '#1e2230', // 节点填充色：高级钛晶灰
		primaryBorderColor: '#3b4261', // 节点边框：柔和幽灵蓝
		primaryTextColor: '#f8fafc', // 节点文字：明亮高光白（非刺眼纯白）

		// === 次要节点 & 特殊状态样式 (如条件框、决策节点) ===
		secondaryColor: '#25293a', // 替代节点背景
		secondaryBorderColor: '#535b80', // 替代节点边框
		secondaryTextColor: '#e2e8f0',
		tertiaryColor: '#161925',
		tertiaryBorderColor: '#2d3142',
		tertiaryTextColor: '#cbd5e1',

		// === 线条与箭头 (全图表连线通用) ===
		lineColor: '#6366f1', // 连线颜色：极具科技感的霓虹靛蓝（Indigo）
		arrowheadColor: '#6366f1', // 箭头颜色：与连线保持一致
		edgeLabelBackground: '#1a1c28', // 线上文字（Label）的背景框，完美融于深色
		labelTextColor: '#94a3b8', // 线上文字本身的颜色

		// === 子图容器样式 (针对你提到的 .cluster rect) ===
		clusterBkg: '#0f1215', // 子图（集群）内部背景色，比主背景略深，极具层次感
		clusterBorder: '#000', // 子图的外边框颜色
		titleColor: '#38bdf8', // 子图标题文字颜色：亮天蓝

		// === 时序图专属变量 (Sequence Diagrams) ===
		actorBkg: '#1e2230', // 参与者（小人/方框）背景
		actorBorder: '#6366f1', // 参与者边框（用霓虹蓝提神）
		actorTextColor: '#f8fafc', // 参与者文字
		actorLineColor: '#334155', // 生命线（虚线）颜色
		signalColor: '#38bdf8', // 信号线、激活线颜色
		signalInverseColor: '#12131a',
		noteBkgColor: '#2e2342', // 便签（Note）背景色：优雅的暗紫
		noteBorderColor: '#bd93f9', // 便签边框：浅霓虹紫
		noteTextColor: '#f8fafc', // 便签文字

		// === 额外特殊组件 (如用户旅程图、饼图等) ===
		sectionBkgColor: '#1e1b4b', // 阶段区间背景
		sectionBkgColor2: '#311042' // 交替阶段区间背景
	}
} as const;

/** Language-mermaid regex used by both marked.js post-processing and the SSR path. */
const CODE_BLOCK_RE = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;

/**
 * Convert marked.js output `<pre><code class="language-mermaid">…` blocks
 * into `<pre class="mermaid">…` so mermaid's runtime can pick them up.
 */
export function convertMermaidMarkup(html: string): string {
	return html.replace(CODE_BLOCK_RE, '<pre class="mermaid">$1</pre>');
}

/**
 * Find and render unprocessed `pre.mermaid` blocks inside `root`.
 * Uses dynamic `import('mermaid')` so the library is only loaded when needed.
 * Silently catches per-block errors but logs them to the console.
 */
export function initMermaid(root: HTMLElement): void {
	if (!root) return;
	const blocks = root.querySelectorAll('pre.mermaid:not(.mermaid-rendered)');
	if (!blocks.length) return;

	import('mermaid')
		.then((m) => {
			m.default.initialize({ ...MERMAID_CONFIG });
			Array.from(blocks).forEach((b) => {
				b.classList.add('mermaid-rendered');
				m.default.run({ nodes: [b as HTMLElement] }).catch((err) => {
					console.error('[mermaid] block render error:', (b.textContent || '').slice(0, 50), err);
				});
			});
		})
		.catch((err) => {
			console.error('[mermaid] import error:', err);
		});
}

/**
 * Server-side Mermaid renderer.
 * Converts ```mermaid blocks in markdown to inline SVG during SSR.
 */
export async function renderMermaidBlocks(markdown: string): Promise<string> {
	const blocks = markdown.match(/```mermaid\s*\n([\s\S]*?)```/g);
	if (!blocks) return markdown;

	try {
		const mermaid = await import('mermaid');
		mermaid.default.initialize({ startOnLoad: false, theme: 'dark' });

		let result = markdown;
		for (const block of blocks) {
			const code = block.replace(/```mermaid\s*\n/, '').replace(/```$/, '').trim();
			if (!code) continue;
			try {
				const { svg } = await mermaid.default.render(`mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, code);
				result = result.replace(block, `<div class="mermaid-svg">${svg}</div>`);
			} catch {
				// Leave block as-is if rendering fails
			}
		}
		return result;
	} catch {
		return markdown;
	}
}

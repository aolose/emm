import TurndownService from 'turndown';
// 引入 GFM 插件中的 tables 组件
import { tables } from 'turndown-plugin-gfm';

let service: TurndownService | null = null;

function getTurndownService() {
	if (!service) {
		service = new TurndownService({
			headingStyle: 'atx',
			codeBlockStyle: 'fenced',
			bulletListMarker: '-'
		});

		// 1. 注册表格转换插件
		service.use(tables);

		// 2. 清除代码块内 HTML 噪音的规则
		service.addRule('strip-code-tags', {
			filter: (node) => node.nodeName === 'PRE' && node.firstElementChild?.nodeName === 'CODE',
			replacement: (_, node) => {
				const codeText = node.textContent || '';
				return `\n\`\`\`\n${codeText.trim()}\n\`\`\`\n`;
			}
		});
	}
	return service;
}

/**
 * Convert HTML string (including tables) to Markdown safely.
 */
export function htmlToMd(html: string): string {
	if (!html) return '';

	// 过滤网页全文本的 head/style 噪音
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	const turndownInstance = getTurndownService();
	return turndownInstance.turndown(doc.body);
}

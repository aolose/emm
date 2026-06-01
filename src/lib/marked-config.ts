import { marked } from 'marked';

export function configureMarked() {
	const renderer = new marked.Renderer();
	renderer.image = function ({ href, title, text }) {
		let attr = '';
		let titleAttr = '';
		if (title) {
			const m = title.match(/^(\d+(?:%|px)?)(?:x(\d+(?:%|px)?))?$/);
			if (m) {
				const [_full, w, h] = m;
				const isPercent = w.endsWith('%') || (h && h.endsWith('%'));
				if (isPercent) {
					attr = ` style="width:${w};${h ? ` height:${h};` : ''}"`;
				} else {
					attr = ` width="${w.replace('px', '')}"${h ? ` height="${h.replace('px', '')}"` : ''}`;
				}
			} else {
				titleAttr = ` title="${title}"`;
			}
		}
		return `<img src="${href}" alt="${text}"${titleAttr}${attr}>`;
	};
	marked.setOptions({ renderer, headerIds: true, gfm: true });
}

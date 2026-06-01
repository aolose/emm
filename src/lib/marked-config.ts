import { marked } from 'marked';

export function configureMarked() {
	const renderer = new marked.Renderer();
	renderer.image = function ({ href, title, text }) {
		let style = '';
		let titleAttr = '';
		if (title) {
			const m = title.match(/^(\d+(?:%|px)?)(?:x(\d+(?:%|px)?))?$/);
			if (m) {
				const [_full, w, h] = m;
				style = ` style="width:${w};${h ? ` height:${h};` : ''}"`;
			} else {
				titleAttr = ` title="${title}"`;
			}
		}
		return `<img src="${href}" alt="${text}"${titleAttr}${style}>`;
	};
	marked.setOptions({ renderer, headerIds: true, gfm: true });
}

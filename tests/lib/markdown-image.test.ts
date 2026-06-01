import { describe, it, expect } from 'bun:test';
import { marked } from 'marked';

function setupRenderer() {
	const renderer = new marked.Renderer();
	renderer.image = function ({ href, title, text }: { href: string; title: string | null; text: string }) {
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

describe('Markdown image size via title attribute', () => {
	setupRenderer();

	// ── Width only ───────────────────────────────────────────────────

	it('parses "300" as width=300', () => {
		const html = marked.parse('![cat](/cat.webp "300")') as string;
		expect(html).toContain('style="width:300;"');
		expect(html).not.toContain('title="300"');
	});

	it('parses "300px" as width=300px', () => {
		const html = marked.parse('![cat](/cat.webp "300px")') as string;
		expect(html).toContain('style="width:300px;"');
		expect(html).not.toContain('title="300px"');
	});

	it('parses "50%" as width=50%', () => {
		const html = marked.parse('![cat](/cat.webp "50%")') as string;
		expect(html).toContain('style="width:50%;"');
		expect(html).not.toContain('title="50%"');
	});

	// ── Width x Height ───────────────────────────────────────────────

	it('parses "300x200" as width=300 height=200', () => {
		const html = marked.parse('![cat](/cat.webp "300x200")') as string;
		expect(html).toContain('style="width:300; height:200;"');
		expect(html).not.toContain('title="300x200"');
	});

	it('parses "50%x30%" as width=50% height=30%', () => {
		const html = marked.parse('![cat](/cat.webp "50%x30%")') as string;
		expect(html).toContain('style="width:50%; height:30%;"');
	});

	// ── Normal title ─────────────────────────────────────────────────

	it('keeps text title as title attribute', () => {
		const html = marked.parse('![cat](/cat.webp "A cute cat")') as string;
		expect(html).toContain('title="A cute cat"');
		expect(html).not.toContain('style=');
	});

	// ── No title ─────────────────────────────────────────────────────

	it('no title produces plain img tag', () => {
		const html = marked.parse('![cat](/cat.webp)') as string;
		expect(html).toContain('<img src="/cat.webp" alt="cat">');
		expect(html).not.toContain('title=');
		expect(html).not.toContain('style=');
	});

	// ── Edge cases ───────────────────────────────────────────────────

	it('number-only alt text is unaffected', () => {
		const html = marked.parse('![300](/cat.webp "400")') as string;
		expect(html).toContain('alt="300"');
		expect(html).toContain('style="width:400;"');
		expect(html).not.toContain('title="400"');
	});

	it('title starting with number but with text is kept', () => {
		const html = marked.parse('![cat](/cat.webp "300px wide")') as string;
		expect(html).toContain('title="300px wide"');
		expect(html).not.toContain('style=');
	});
});

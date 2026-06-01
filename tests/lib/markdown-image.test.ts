import { describe, it, expect } from 'bun:test';
import { marked } from 'marked';
import { configureMarked } from '../../src/lib/marked-config';

describe('Markdown image size via title attribute', () => {
	configureMarked();

	// ── Width only ───────────────────────────────────────────────────

	it('parses "300" as width=300', () => {
		const html = marked.parse('![cat](/cat.webp "300")') as string;
		expect(html).toContain('width="300"');
		expect(html).not.toContain('title="300"');
	});

	it('parses "300px" as width=300', () => {
		const html = marked.parse('![cat](/cat.webp "300px")') as string;
		expect(html).toContain('width="300"');
		expect(html).not.toContain('title="300px"');
	});

	it('parses "50%" as style width=50%', () => {
		const html = marked.parse('![cat](/cat.webp "50%")') as string;
		expect(html).toContain('style="width:50%;"');
		expect(html).not.toContain('title="50%"');
	});

	// ── Width x Height ───────────────────────────────────────────────

	it('parses "300x200" as width=300 height=200', () => {
		const html = marked.parse('![cat](/cat.webp "300x200")') as string;
		expect(html).toContain('width="300"');
		expect(html).toContain('height="200"');
		expect(html).not.toContain('title="300x200"');
	});

	it('parses "50%x30%" as style width=50% height=30%', () => {
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
		expect(html).toContain('width="400"');
		expect(html).not.toContain('title="400"');
	});

	it('title starting with number but with text is kept', () => {
		const html = marked.parse('![cat](/cat.webp "300px wide")') as string;
		expect(html).toContain('title="300px wide"');
		expect(html).not.toContain('style=');
	});
});

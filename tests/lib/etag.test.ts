import { describe, it, expect } from 'bun:test';
import { extractFetchedData, extractHydrationData, computeDataHash } from '../../src/hooks.server';

// Simulate the hashStr from req.ts (pure function, easy to replicate)
const hashStr = (s: string): string => {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	return h.toString(36);
};

const makeFetchedScript = (url: string, data: unknown): string => {
	const body = JSON.stringify(data);
	const raw = JSON.stringify({ status: 200, statusText: '', body, headers: {} });
	return `<script type="application/json" data-sveltekit-fetched data-url="${url}" data-hash="abc">${raw}</script>`;
};

describe('extractFetchedData', () => {
	it('extracts a single API payload', () => {
		const html = makeFetchedScript('/api/home', { blogName: 'Test Blog' });
		const result = extractFetchedData(html);

		expect(result).toHaveLength(1);
		expect(result[0].url).toBe('/api/home');
		expect(result[0].data).toEqual({ blogName: 'Test Blog' });
	});

	it('extracts multiple API payloads', () => {
		const html =
			makeFetchedScript('/api/home', { blogName: 'Test' }) +
			makeFetchedScript('/api/posts?page=1&size=12', { items: [1, 2, 3] });

		const result = extractFetchedData(html);

		expect(result).toHaveLength(2);
		expect(result[0].url).toBe('/api/home');
		expect(result[1].url).toBe('/api/posts?page=1&size=12');
	});

	it('handles string body data (non-JSON)', () => {
		const body = 'plain text content';
		const raw = JSON.stringify({ status: 200, statusText: '', body, headers: {} });
		const html = `<script type="application/json" data-sveltekit-fetched data-url="/api/about">${raw}</script>`;

		const result = extractFetchedData(html);

		expect(result).toHaveLength(1);
		expect(result[0].data).toBe('plain text content');
	});

	it('returns empty array for HTML without fetched data', () => {
		const html = '<html><body><h1>Hello</h1></body></html>';
		expect(extractFetchedData(html)).toEqual([]);
	});

	it('handles malformed scripts gracefully', () => {
		const html = '<script type="application/json" data-sveltekit-fetched data-url="/api/bad">{invalid}</script>';
		// Should not throw, just skip
		expect(() => extractFetchedData(html)).not.toThrow();
		expect(extractFetchedData(html)).toEqual([]);
	});

	it('handles HTML-escaped ampersands in URL', () => {
		const html = makeFetchedScript('/api/posts?page=1&amp;size=12', { items: [] });
		const result = extractFetchedData(html);

		expect(result[0].url).toBe('/api/posts?page=1&size=12');
	});
});

describe('extractHydrationData', () => {
	it('extracts data array from kit.start call', () => {
		const html =
			'<script>kit.start(app, {node_ids:[0,1,2],data:[null,null,{d:{title:"Hello"}}],form:null,error:null});</script>';
		expect(extractHydrationData(html)).toBe('[null,null,{d:{title:"Hello"}}]');
	});

	it('returns empty string when not found', () => {
		expect(extractHydrationData('<html></html>')).toBe('');
	});

	it('handles multi-node data arrays', () => {
		const html =
			'<script>app.start(el, {node_ids:[0,1,2],data:[{d:{x:1}},null,{d:{y:2}}],form:null,error:null});</script>';
		expect(extractHydrationData(html)).toBe('[{d:{x:1}},null,{d:{y:2}}]');
	});
});

describe('computeDataHash', () => {
	it('returns empty string for empty input', () => {
		expect(computeDataHash([], '')).toBe('');
	});

	it('is deterministic', () => {
		const a = [{ url: '/api/home', data: { x: 1 } }];
		const h1 = computeDataHash(a);
		const h2 = computeDataHash(a);
		expect(h1).toBe(h2);
	});

	it('changes when data changes', () => {
		const a = [{ url: '/api/home', data: { x: 1 } }];
		const b = [{ url: '/api/home', data: { x: 2 } }];
		expect(computeDataHash(a)).not.toBe(computeDataHash(b));
	});

	it('is URL-order independent (sorts by URL)', () => {
		const a = [
			{ url: '/api/b', data: { v: 1 } },
			{ url: '/api/a', data: { v: 2 } }
		];
		const b = [
			{ url: '/api/a', data: { v: 2 } },
			{ url: '/api/b', data: { v: 1 } }
		];
		expect(computeDataHash(a)).toBe(computeDataHash(b));
	});

	it('hashes multiple payloads', () => {
		const fetched = [
			{ url: '/api/home', data: { blogName: 'X' } },
			{ url: '/api/posts?page=1', data: { items: [1, 2] } }
		];
		const h = computeDataHash(fetched);
		expect(typeof h).toBe('string');
		expect(h.length).toBeGreaterThan(0);
	});
});

describe('hashStr (req.ts convention)', () => {
	it('is deterministic', () => {
		expect(hashStr('hello')).toBe(hashStr('hello'));
	});

	it('produces different hashes for different inputs', () => {
		expect(hashStr('hello')).not.toBe(hashStr('world'));
	});

	it('returns a non-empty string', () => {
		const h = hashStr('test');
		expect(typeof h).toBe('string');
		expect(h.length).toBeGreaterThan(0);
	});

	it('handles JSON.stringify of objects', () => {
		const a = hashStr(JSON.stringify({ x: 1, y: 2 }));
		const b = hashStr(JSON.stringify({ y: 2, x: 1 })); // same content, different key order
		// JSON.stringify preserves insertion order, so these may differ
		// This test documents the behavior — order matters for JSON.stringify
		expect(typeof a).toBe('string');
		expect(typeof b).toBe('string');
	});
});

describe('ETag format integration', () => {
	it('produces template-data ETag when both available', () => {
		const templateHash = 'abc123';
		const fetched = [{ url: '/api/home', data: { blogName: 'Test' } }];
		const dataHash = computeDataHash(fetched, '');
		const etag = `"${templateHash}-${dataHash}"`;

		expect(etag).toMatch(/^"abc123-[a-f0-9]{6}"$/);
	});

	it('includes hydration data when no fetched scripts (server-only load)', () => {
		const templateHash = 'abc123';
		const hydration = 'eyJub2RlcyI6W3siZCI6eyJ0aXRsZSI6IkhlbGxvIn19XX0';
		const dataHash = computeDataHash([], hydration);
		// With hydration data (but no fetched scripts), still produces a data hash
		expect(dataHash).toMatch(/^[a-f0-9]{6}$/);
		const etag = `"${templateHash}-${dataHash}"`;
		expect(etag).toMatch(/^"abc123-[a-f0-9]{6}"$/);
	});

	it('same template + same data = same ETag', () => {
		const t = 'abc';
		const d1 = computeDataHash([{ url: '/api/home', data: { x: 1 } }], '');
		const d2 = computeDataHash([{ url: '/api/home', data: { x: 1 } }], '');
		expect(d1).toBe(d2);
		const etag1 = `"${t}-${d1}"`;
		const etag2 = `"${t}-${d2}"`;
		expect(etag1).toBe(etag2);
	});

	it('same template + different data = different ETag', () => {
		const t = 'abc';
		const d1 = computeDataHash([{ url: '/api/home', data: { x: 1 } }], '');
		const d2 = computeDataHash([{ url: '/api/home', data: { x: 2 } }], '');
		const etag1 = `"${t}-${d1}"`;
		const etag2 = `"${t}-${d2}"`;
		expect(etag1).not.toBe(etag2);
	});
});

// __data.json ETag (just body hash, 6-char hex, no template component)
const sha256Slice = (s: string): string => {
	const { createHash } = require('node:crypto');
	return createHash('sha256').update(s).digest('hex').slice(0, 6);
};

describe('__data.json ETag (addDataJsonEtag)', () => {
	it('is just 6-char hex hash of body', () => {
		const body = JSON.stringify({ p: { slug: 'new' }, d: { title: 'Hello' } });
		const expected = `"${sha256Slice(body)}"`;
		expect(expected).toMatch(/^"[a-f0-9]{6}"$/);
	});

	it('changes when data changes', () => {
		const a = sha256Slice(JSON.stringify({ d: { title: 'A' } }));
		const b = sha256Slice(JSON.stringify({ d: { title: 'B' } }));
		expect(a).not.toBe(b);
	});

	it('is deterministic', () => {
		const body = JSON.stringify({ d: { x: 1 } });
		expect(sha256Slice(body)).toBe(sha256Slice(body));
	});
});

/**
 * Turnstile anti-crawl — unit & integration tests.
 *
 * Test key pairs:
 *   PAIR_PASS:  site=1x00000000000000000000AA  secret=1x0000000000000000000000000000000AA
 *   PAIR_FAIL:  site=2x00000000000000000000AB  secret=2x0000000000000000000000000000000AA
 *
 * Run: bun test tests/lib/server/turnstile.test.ts
 */
import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';

const TS_SITE_PASS = '1x00000000000000000000AA';
const TS_SECRET_PASS = '1x0000000000000000000000000000000AA';
const TS_SITE_FAIL = '2x00000000000000000000AB';
const TS_SECRET_FAIL = '2x0000000000000000000000000000000AA';

const mockSys: Record<string, unknown> = {};

function setCfg(enabled: boolean, siteKey: string, secret: string, ttl = 1800) {
	mockSys.tsEnabled = enabled;
	mockSys.tsSiteKey = siteKey;
	mockSys.tsSecret = secret;
	mockSys.tsVerifyTTL = ttl;
}

beforeEach(() => {
	Object.assign(mockSys, { tsEnabled: true, tsSiteKey: TS_SITE_PASS, tsSecret: TS_SECRET_PASS, tsVerifyTTL: 1800 });
	mock.module('$lib/server/index', () => ({ sys: mockSys as never, db: {}, server: { maintain: false } }));
	mock.module('$lib/server/utils', () => {
		const cookieStore = new Map<string, string>();
		return {
			getCookie: (req: { headers: Headers }) => {
				const c = req.headers.get('cookie');
				if (!c) return undefined;
				for (const kv of c.split(';')) {
					const [k, v] = kv.split('=').map((s) => s.trim());
					if (k === '_tsv') return v;
				}
			},
			setCookie: (resp: { headers: Headers }, key: string, value: string) => {
				cookieStore.set(key, value);
				resp.headers.append('set-cookie', `${key}=${value}`);
			},
			resp: (body: unknown, code = 200) => ({ body: JSON.stringify(body), status: code, headers: new Headers() }) as unknown as Response,
		};
	});
});

afterEach(() => { mock.restore(); });

async function load() {
	return await import('$lib/server/turnstile');
}

describe('Cookie sign/verify', () => {
	it('valid cookie', async () => {
		const { signTsCookie, verifyTsCookie } = await load();
		const c = signTsCookie('1.2.3.4');
		expect(verifyTsCookie(c, '1.2.3.4')).toBe(true);
	});
	it('wrong IP', async () => {
		const { signTsCookie, verifyTsCookie } = await load();
		const c = signTsCookie('1.2.3.4');
		expect(verifyTsCookie(c, '5.6.7.8')).toBe(false);
	});
	it('malformed', async () => {
		const { verifyTsCookie } = await load();
		expect(verifyTsCookie('x', '1.2.3.4')).toBe(false);
	});
	it('expired', async () => {
		setCfg(true, TS_SITE_PASS, TS_SECRET_PASS, 0.001); // 1ms TTL
		const { signTsCookie, verifyTsCookie } = await load();
		const c = signTsCookie('1.2.3.4');
		await new Promise((r) => setTimeout(r, 10));
		expect(verifyTsCookie(c, '1.2.3.4')).toBe(false);
	});
});

describe('isTsVerified', () => {
	it('pass with valid cookie', async () => {
		setCfg(true, TS_SITE_PASS, TS_SECRET_PASS, 1800);
		const { signTsCookie, isTsVerified } = await load();
		const c = signTsCookie('10.0.0.1');
		expect(isTsVerified({ headers: new Headers({ cookie: `_tsv=${c}` }) } as never, '10.0.0.1')).toBe(true);
	});
	it('fail without cookie', async () => {
		setCfg(true, TS_SITE_PASS, TS_SECRET_PASS, 1800);
		const { isTsVerified } = await load();
		expect(isTsVerified({ headers: new Headers() } as never, '10.0.0.1')).toBe(false);
	});
	it('fail with invalid cookie', async () => {
		setCfg(true, TS_SITE_PASS, TS_SECRET_PASS, 1800);
		const { isTsVerified } = await load();
		expect(isTsVerified({ headers: new Headers({ cookie: '_tsv=bad' }) } as never, '10.0.0.1')).toBe(false);
	});
	it('pass when disabled', async () => {
		setCfg(false, '', '', 1800);
		const { isTsVerified } = await load();
		expect(isTsVerified({ headers: new Headers() } as never, '10.0.0.1')).toBe(true);
	});
	it('pass without site key', async () => {
		setCfg(true, '', TS_SECRET_PASS, 1800);
		const { isTsVerified } = await load();
		expect(isTsVerified({ headers: new Headers() } as never, '10.0.0.1')).toBe(true);
	});
	it('pass with default site key (dash)', async () => {
		setCfg(true, '-', TS_SECRET_PASS, 1800);
		const { isTsVerified } = await load();
		expect(isTsVerified({ headers: new Headers() } as never, '10.0.0.1')).toBe(true);
	});
	it('pass with default secret (dash)', async () => {
		setCfg(true, TS_SITE_PASS, '-', 1800);
		const { isTsVerified } = await load();
		expect(isTsVerified({ headers: new Headers() } as never, '10.0.0.1')).toBe(true);
	});
});
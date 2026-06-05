/**
 * UA Collection Mode — integration test
 *
 * Simulates distributed crawlers with different X-Forwarded-For IPs
 * sharing the same User-Agent, and verifies that the collection-mode
 * trigger correctly batches and returns all offending IPs.
 */
import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ---------------------------------------------------------------------------
// Mock external modules
// ---------------------------------------------------------------------------

mock.module('$app/navigation', () => ({ goto: () => {} }));
mock.module('$app/environment', () => ({ browser: false }));
mock.module('$app/stores', () => ({ page: { subscribe: () => () => {} } }));

mock.module('$lib/server/index', () => ({
	db: null,
	sys: { cfAccountId: '', cfApiToken: '', cfListId: '' }
}));

mock.module('$lib/server/utils', () => ({
	checkRedirect: () => undefined,
	getClient: () => undefined,
	getClientAddr: () => '127.0.0.1',
	model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
	sysStatue: 2,
	resp: () => new Response(),
	DBProxy: () => ({}),
	mkdir: () => null,
	mv: () => null,
	getReqJson: async () => ({}),
	setToken: () => {},
	delCookie: () => {},
	getIp: () => '127.0.0.1',
	getCookie: () => undefined,
	setCookie: () => {},
	debugMode: false,
	combineResult: () => '',
	throwDbProxyError: () => {},
	pageBuilder: () => ({}),
	sqlFields: () => ''
}));

mock.module('$lib/server/ipLite', () => ({
	ipInfo: () => null,
	ipInfoStr: () => '',
	geoClose: () => {},
	geoStatue: () => false,
	loadGeoDb: () => {}
}));

mock.module('$lib/server/puv', () => ({
	ruv: () => {},
	loadPuv: () => {},
	getRuv: () => []
}));

mock.module('$lib/enum', () => ({
	permission: { Admin: 0, Read: 1, Post: 2 },
	contentType: 'content-type',
	encryptIv: 'eiv',
	encTypeIndex: 'eti',
	method: { POST: 0, GET: 1, DELETE: 2, PATCH: 3 },
	dataType: { json: 'application/json', text: 'text/plain', binary: 'application/octet-stream' },
	NULL: { INT: -1, TEXT: '-', DATE: new Date(0) },
	requireType: { Post: 0, Comment: 1 },
	cmStatus: { Pending: 0, Approve: 1, Reject: 2 },
	pmsName: { Admin: 'fully control', Read: 'read data', Post: 'read posts' },
	reqMethod: ['POST', 'GET', 'DELETE', 'PATCH'],
	geTypeIndex: () => '0',
	getIndexType: () => 'application/json'
}));

mock.module('$lib/utils', () => ({
	arrFilter: (a: any) => a,
	hasFwRuleFilter: () => false,
	hds2Str: () => '',
	str2Hds: () => [],
	trim: (s?: string) => (s || '').trim(),
	enc: async (s: string) => s,
	legacyEnc: async (s: string) => s,
	setPwdSalt: () => {},
	filter: (o: any) => o,
	time: () => '',
	diffObj: () => ({}),
	getErr: () => '',
	watch: () => () => {},
	randNum: () => 0,
	randStr: () => '',
	ivGen: () => new Uint8Array(16),
	buf2Str: (b: any) => String(b),
	buf2Num: () => 0,
	data2Buf: () => new ArrayBuffer(0),
	genPubKey: async () => new ArrayBuffer(0)
}));

mock.module('$lib/types', () => ({}));

mock.module('$lib/server/turnstile', () => ({
	isTsVerified: () => true,
	challengeResponse: () => new Response()
}));

mock.module('ip-matching', () => ({
	matches: () => false
}));

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

import { __test } from '../../../src/lib/server/firewall';
import { FWRule } from '../../../src/lib/server/model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simRequest(ip: string, ua: string, path = '/api/test') {
	__test.recordUaEntry(ip, ua, path);
}

function makeCollectionRule(opts: {
	path?: string;
	ua?: string;
	uaCount?: string;
	rate?: string;
}): FWRule {
	const r = new FWRule();
	r.trigger = true;
	r.uaMode = true;
	r.active = true;
	r.path = opts.path || '/^\\/api\\/.*/';
	r.ua = opts.ua || '';
	r.uaCount = opts.uaCount || '3';
	r.rate = opts.rate || '5';
	r.status = ''; // clear TEXT sentinel '-' → no status filter
	r.ip = ''; // clear TEXT sentinel
	r.method = ''; // clear TEXT sentinel
	r.country = ''; // clear TEXT sentinel
	r.headers = ''; // clear TEXT sentinel
	return r;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UA Collection — distributed crawler detection', () => {
	beforeEach(() => {
		__test.clearUaEntries();
	});

	describe('recordUaEntry', () => {
		it('records entries into the buffer', () => {
			simRequest('10.0.0.1', 'Bot/1.0');
			simRequest('10.0.0.2', 'Bot/1.0');
			expect(__test.getUaEntries().length).toBe(2);
		});

		it('caps at 1000 entries', () => {
			for (let i = 0; i < 1100; i++) simRequest(`10.0.0.${i % 255}`, `UA-${i}`);
			expect(__test.getUaEntries().length).toBeLessThanOrEqual(1000);
		});
	});

	describe('analyzeUaTrigger — basic threshold', () => {
		it('returns empty when below threshold', () => {
			simRequest('10.0.0.1', 'Crawler/1.0');
			simRequest('10.0.0.2', 'Crawler/1.0');
			const rule = makeCollectionRule({ uaCount: '3', rate: '5' });
			expect(__test.analyzeUaTrigger(rule).length).toBe(0);
		});

		it('returns IPs when dual thresholds met', () => {
			for (const ip of ['10.0.0.1', '10.0.0.2', '10.0.0.3']) {
				simRequest(ip, 'Crawler/1.0');
				simRequest(ip, 'Crawler/1.0');
			}
			const rule = makeCollectionRule({ uaCount: '3', rate: '5' });
			const ips = __test.analyzeUaTrigger(rule);
			expect(ips.sort()).toEqual(['10.0.0.1', '10.0.0.2', '10.0.0.3']);
		});
	});

	describe('analyzeUaTrigger — UA regex filter', () => {
		it('only matches configured UA pattern', () => {
			for (const ip of ['10.0.0.1', '10.0.0.2', '10.0.0.3']) {
				simRequest(ip, 'BotUA/1.0');
				simRequest(ip, 'BotUA/1.0');
			}
			simRequest('10.0.0.4', 'Chrome/120');
			simRequest('10.0.0.5', 'Firefox/121');
			const rule = makeCollectionRule({ ua: '/^BotUA\\/.*/', uaCount: '3', rate: '5' });
			const ips = __test.analyzeUaTrigger(rule);
			expect(ips).toContain('10.0.0.1');
			expect(ips).not.toContain('10.0.0.4');
		});
	});

	describe('analyzeUaTrigger — multiple UA groups', () => {
		it('blocks all groups meeting threshold', () => {
			for (const ip of ['10.0.1.1', '10.0.1.2', '10.0.1.3']) {
				simRequest(ip, 'BotA/1.0');
				simRequest(ip, 'BotA/1.0');
			}
			for (const ip of ['10.0.2.1', '10.0.2.2', '10.0.2.3']) {
				simRequest(ip, 'BotB/2.0');
				simRequest(ip, 'BotB/2.0');
			}
			const rule = makeCollectionRule({ uaCount: '3', rate: '5' });
			expect(__test.analyzeUaTrigger(rule).length).toBe(6);
		});
	});

	describe('analyzeUaTrigger — path matching', () => {
		it('only considers matching paths', () => {
			for (const ip of ['10.0.0.1', '10.0.0.2', '10.0.0.3']) {
				simRequest(ip, 'Crawler/1.0', '/api/test');
				simRequest(ip, 'Crawler/1.0', '/api/test');
			}
			simRequest('10.0.0.99', 'Crawler/1.0', '/posts/hello');
			const rule = makeCollectionRule({ path: '/^\\/api\\/.*/', uaCount: '3', rate: '5' });
			expect(__test.analyzeUaTrigger(rule).length).toBe(3);
		});
	});

	describe('Distributed crawler simulation', () => {
		it('catches 10 distributed bot IPs with same UA', () => {
			const botUA = 'Mozilla/5.0 (compatible; BadBot/2.0)';
			for (let i = 1; i <= 10; i++) {
				simRequest(`192.168.${i}.${i}`, botUA, '/api/search');
				simRequest(`192.168.${i}.${i}`, botUA, '/api/search');
			}
			// legitimate traffic
			simRequest('10.0.0.1', 'Mozilla/5.0 Chrome/120', '/api/search');
			simRequest('10.0.0.2', 'Mozilla/5.0 Safari/17', '/api/search');

			const rule = makeCollectionRule({ uaCount: '5', rate: '10' });
			const ips = __test.analyzeUaTrigger(rule);
			expect(ips.length).toBe(10);
			for (let i = 1; i <= 10; i++) expect(ips).toContain(`192.168.${i}.${i}`);
			expect(ips).not.toContain('10.0.0.1');
		});

		it('no false positive on diverse normal traffic', () => {
			const uas = ['Chrome/120', 'Safari/17', 'Firefox/121', 'Edge/120'];
			for (let i = 0; i < 20; i++) {
				simRequest(`10.0.0.${(i % 10) + 1}`, uas[i % 4], '/posts/hello');
			}
			const rule = makeCollectionRule({ uaCount: '5', rate: '10' });
			expect(__test.analyzeUaTrigger(rule).length).toBe(0);
		});
	});

	describe('hitRule — schedule gating', () => {
		const origUTCHours = Date.prototype.getUTCHours;
		function setUtcHour(h: number) {
			Date.prototype.getUTCHours = () => h;
		}
		function restoreUtcHour() {
			Date.prototype.getUTCHours = origUTCHours;
		}

		it('rule without schedule always matches', () => {
			const rule = makeCollectionRule({});
			const log = { ip: '10.0.0.1', path: '/api/test' };
			// rule passes regardless of hour
			setUtcHour(3);
			expect(__test.hitRule(log, rule)).toBe(true);
			setUtcHour(15);
			expect(__test.hitRule(log, rule)).toBe(true);
			restoreUtcHour();
		});

		it('rule with schedule active within range, inactive outside', () => {
			const rule = makeCollectionRule({});
			rule.schedule = '0-6';

			const log = { ip: '10.0.0.1', path: '/api/test' };

			setUtcHour(3); // 3 ∈ [0,6]
			expect(__test.hitRule(log, rule)).toBe(true);

			setUtcHour(15); // 15 ∉ [0,6]
			expect(__test.hitRule(log, rule)).toBe(false);

			restoreUtcHour();
		});

		it('schedule boundary values are inclusive', () => {
			const rule = makeCollectionRule({});
			rule.schedule = '10-20';

			const log = { ip: '10.0.0.1', path: '/api/test' };

			setUtcHour(10);
			expect(__test.hitRule(log, rule)).toBe(true);

			setUtcHour(20);
			expect(__test.hitRule(log, rule)).toBe(true);

			setUtcHour(9);
			expect(__test.hitRule(log, rule)).toBe(false);

			setUtcHour(21);
			expect(__test.hitRule(log, rule)).toBe(false);

			restoreUtcHour();
		});

		it('schedule with multiple ranges', () => {
			const rule = makeCollectionRule({});
			rule.schedule = '0-6,18-23';

			const log = { ip: '10.0.0.1', path: '/api/test' };

			setUtcHour(5);
			expect(__test.hitRule(log, rule)).toBe(true);

			setUtcHour(19);
			expect(__test.hitRule(log, rule)).toBe(true);

			setUtcHour(23);
			expect(__test.hitRule(log, rule)).toBe(true);

			setUtcHour(12);
			expect(__test.hitRule(log, rule)).toBe(false);

			restoreUtcHour();
		});
	});
});

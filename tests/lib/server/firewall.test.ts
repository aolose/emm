import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

// Mock SvelteKit modules
mock.module('$app/navigation', () => ({ goto: () => {} }));
mock.module('$app/environment', () => ({ browser: false }));
mock.module('$app/stores', () => ({ page: { subscribe: () => () => {} } }));

// Mock database for addRule / addBlackListRule tests
mock.module('$lib/server/index', () => ({
	db: { save: () => {}, all: () => [], delByPk: () => {}, count: () => 0 },
	sys: { maxFireLogs: 1000 }
}));

let testIp = '127.0.0.1';
let checkRedirectReturn = '';
let mockSysStatue = 2;

mock.module('$lib/server/utils', () => ({
	checkRedirect: () => checkRedirectReturn,
	getClient: () => undefined,
	getClientAddr: () => testIp,
	model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
	get sysStatue() {
		return mockSysStatue;
	}
}));

mock.module('$lib/server/ipLite', () => ({
	ipInfo: () => null,
	ipInfoStr: () => ''
}));

mock.module('$lib/server/puv', () => ({
	ruv: () => {}
}));

mock.module('$lib/enum', () => ({
	permission: { Admin: 0, Read: 1, Post: 2 },
	NULL: { INT: -1, TEXT: '-', DATE: new Date(0) }
}));

mock.module('$lib/utils', () => ({
	arrFilter: (a: any) => a,
	hasFwRuleFilter: () => false,
	hds2Str: () => '',
	str2Hds: () => [],
	trim: (s?: string) => (s || '').trim()
}));

mock.module('$lib/server/turnstile', () => ({
	isTsVerified: () => false,
	challengeResponse: () => new Response('turnstile', { status: 418 }),
	challengeResponseRedirect: () => new Response('', { status: 307 }),
	challengeResponseJson: () => new Response('{}', { status: 403 }),
	signTsCookie: () => '',
	verifyTsCookie: () => false,
	getTsCookie: () => undefined,
	setTsCookie: () => {},
	verifyTurnstileToken: async () => false
}));

import { FWRule } from '../../../src/lib/server/model';

describe('Firewall rule matching', () => {
	describe('matchRuleValue logic (inline)', () => {
		const matchRuleValue = (pattern: string, target: string): boolean => {
			if (!pattern) return true;
			const m = pattern.match(/^\/(.+)\/([gimsu]*)$/);
			if (m) {
				try {
					return new RegExp(m[1], m[2]).test(target);
				} catch {
					return false;
				}
			}
			return target.toLowerCase().includes(pattern.toLowerCase());
		};

		it('exact substring match', () => {
			expect(matchRuleValue('admin', '/admin/settings')).toBe(true);
			expect(matchRuleValue('admin', '/posts')).toBe(false);
		});

		it('case-insensitive match', () => {
			expect(matchRuleValue('ADMIN', '/admin')).toBe(true);
		});

		it('regex match', () => {
			expect(matchRuleValue('/^\\/api\\/.*/', '/api/test')).toBe(true);
			expect(matchRuleValue('/^\\/api\\/.*/', '/posts')).toBe(false);
		});

		it('empty pattern matches all', () => {
			expect(matchRuleValue('', '/anything')).toBe(true);
		});
	});

	describe('isInRange logic (inline)', () => {
		const isInRange = (str: string, num: number | undefined): boolean => {
			if (!num) return false;
			const groups = str.split(/[,; ]+/);
			for (const g of groups) {
				const [a, b] = g.split(/[-~]/, 2);
				if (/\d+/g.test(a)) {
					if (num >= +a) {
						if (/\d+/g.test(b)) {
							if (num > +b) continue;
						}
						return true;
					}
				}
			}
			return false;
		};

		it('single number match (>= semantics)', () => {
			expect(isInRange('200', 200)).toBe(true);
			expect(isInRange('200', 199)).toBe(false);
		});

		it('range match', () => {
			expect(isInRange('400-500', 404)).toBe(true);
			expect(isInRange('400-500', 200)).toBe(false);
		});

		it('multiple ranges', () => {
			expect(isInRange('200-299,400-499', 404)).toBe(true);
			expect(isInRange('200-299,400-499', 301)).toBe(false);
		});

		it('undefined num returns false', () => {
			expect(isInRange('200', undefined)).toBe(false);
		});
	});

	describe('rateLimiter parsing', () => {
		it('parses rate strings correctly', () => {
			const rule = new FWRule();
			rule.rate = '5/60,10/3600';

			const [maxWindow, limiter] = rule.rateLimiter();
			expect(maxWindow).toBe(3600 * 1000);

			expect(limiter(5, 59000)).toBe(5);
			expect(limiter(4, 59000)).toBe(0);
			expect(limiter(10, 3599000)).toBe(10);
		});

		it('empty rate returns zero max window', () => {
			const rule = new FWRule();
			const [maxWindow, limiter] = rule.rateLimiter();
			expect(maxWindow).toBe(0);
			expect(limiter(100, 1)).toBe(0);
		});
	});

	describe('getUaCountThreshold', () => {
		it('parses numeric string', () => {
			const rule = new FWRule();
			rule.uaCount = '5';
			expect(rule.getUaCountThreshold()).toBe(5);
		});

		it('defaults to 1 for empty', () => {
			const rule = new FWRule();
			expect(rule.getUaCountThreshold()).toBe(1);
		});

		it('defaults to 1 for zero or negative', () => {
			const rule = new FWRule();
			rule.uaCount = '0';
			expect(rule.getUaCountThreshold()).toBe(1);
			rule.uaCount = '-3';
			expect(rule.getUaCountThreshold()).toBe(1);
		});
	});

	describe('isInSchedule', () => {
		const origGetUTCHours = Date.prototype.getUTCHours;
		function setHour(h: number) {
			Date.prototype.getUTCHours = () => h;
		}
		function restoreHour() {
			Date.prototype.getUTCHours = origGetUTCHours;
		}

		it('empty schedule is always active', () => {
			const rule = new FWRule();
			expect(rule.isInSchedule()).toBe(true);
		});

		it('single range hour within', () => {
			setHour(3);
			const rule = new FWRule();
			rule.schedule = '0-6';
			expect(rule.isInSchedule()).toBe(true);
			restoreHour();
		});

		it('single range hour outside', () => {
			setHour(15);
			const rule = new FWRule();
			rule.schedule = '0-6';
			expect(rule.isInSchedule()).toBe(false);
			restoreHour();
		});

		it('boundary values inclusive', () => {
			const rule = new FWRule();
			rule.schedule = '10-20';
			setHour(10);
			expect(rule.isInSchedule()).toBe(true);
			setHour(20);
			expect(rule.isInSchedule()).toBe(true);
			restoreHour();
		});

		it('multiple ranges', () => {
			const rule = new FWRule();
			rule.schedule = '0-6,18-23';
			setHour(19);
			expect(rule.isInSchedule()).toBe(true);
			setHour(12);
			expect(rule.isInSchedule()).toBe(false);
			restoreHour();
		});

		it('crossing midnight range inside (23-2)', () => {
			const rule = new FWRule();
			rule.schedule = '23-2';
			setHour(23);
			expect(rule.isInSchedule()).toBe(true);
			setHour(0);
			expect(rule.isInSchedule()).toBe(true);
			setHour(1);
			expect(rule.isInSchedule()).toBe(true);
			setHour(2);
			expect(rule.isInSchedule()).toBe(true);
			restoreHour();
		});

		it('crossing midnight range outside (23-2)', () => {
			const rule = new FWRule();
			rule.schedule = '23-2';
			setHour(22);
			expect(rule.isInSchedule()).toBe(false);
			setHour(3);
			expect(rule.isInSchedule()).toBe(false);
			setHour(12);
			expect(rule.isInSchedule()).toBe(false);
			restoreHour();
		});

		it('mixed same-day and crossing-midnight ranges', () => {
			const rule = new FWRule();
			rule.schedule = '8-17,23-2';
			setHour(10);
			expect(rule.isInSchedule()).toBe(true);
			setHour(0);
			expect(rule.isInSchedule()).toBe(true);
			setHour(5);
			expect(rule.isInSchedule()).toBe(false);
			setHour(20);
			expect(rule.isInSchedule()).toBe(false);
			restoreHour();
		});
	});

	describe('uaMode and cfUpload defaults', () => {
		it('uaMode defaults to false', () => {
			const rule = new FWRule();
			expect(rule.uaMode).toBe(false);
		});

		it('cfUpload defaults to false', () => {
			const rule = new FWRule();
			expect(rule.cfUpload).toBe(false);
		});

		it('schedule defaults to TEXT sentinel', () => {
			const rule = new FWRule();
			expect(rule.schedule).toBe('-');
		});
	});

	describe('Rule persistence — addRule + lsRules round-trip', () => {
		let addRule: (fr: FWRule) => void;
		let lsRules: (page: number, size: number) => { items: FWRule[]; total: number };
		let delRule: (ids: number[]) => void;

		beforeEach(async () => {
			const mod = await import('../../../src/lib/server/firewall');
			addRule = mod.addRule;
			lsRules = mod.lsRules;
			delRule = mod.delRule;

			// Initialize module-level arrays (normally done by loadRules).
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);
		});

		it('persists uaMode and cfUpload through addRule → lsRules', () => {
			const rule = new FWRule();
			rule.id = 1;
			rule.path = '/api/test';
			rule.trigger = true;
			rule.uaMode = true;
			rule.cfUpload = true;
			rule.ua = 'Bot/1.0';
			rule.uaCount = '5';
			rule.rate = '10';
			rule.schedule = '0-6';
			rule.mark = 'test-collection';
			rule.active = true;
			rule.ip = '';
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			rule.status = '';

			addRule(rule);

			const result = lsRules(1, 20);
			expect(result.items.length).toBe(1);

			const saved = result.items[0];
			expect(saved.id).toBe(1);
			expect(saved.mark).toBe('test-collection');
			expect(saved.uaMode).toBe(true);
			expect(saved.cfUpload).toBe(true);
			expect(saved.ua).toBe('Bot/1.0');
			expect(saved.uaCount).toBe('5');
			expect(saved.rate).toBe('10');
			expect(saved.schedule).toBe('0-6');
			expect(saved.trigger).toBe(true);
		});

		it('non-trigger rule does NOT set uaMode', () => {
			const rule = new FWRule();
			rule.id = 2;
			rule.ip = '192.168.1.1';
			rule.mark = 'non-trigger';
			rule.trigger = false;
			rule.uaMode = false;
			rule.cfUpload = false;
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			rule.status = '';

			addRule(rule);

			const result = lsRules(1, 20);
			expect(result.items.length).toBe(1);

			const saved = result.items[0];
			expect(saved.id).toBe(2);
			expect(saved.trigger).toBe(false);
			expect(saved.uaMode).toBe(false);
			expect(saved.cfUpload).toBe(false);
		});

		it('lsRules excludes rules with id <= 0', () => {
			const rule = new FWRule();
			rule.id = -1;
			rule.ip = '10.0.0.1';
			rule.trigger = false;
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			rule.status = '';

			addRule(rule);

			const result = lsRules(1, 20);
			expect(result.items.length).toBe(0);
		});
	});

	describe('Trigger → blacklist integration (addBlackListRule)', () => {
		let addBlackListRule: (r: { ip: string; respId: number; mark?: string; log?: boolean }) => void;
		let getBlackList: () => any[];
		let clearBlackList: () => void;

		beforeEach(async () => {
			const mod = await import('../../../src/lib/server/firewall');
			addBlackListRule = mod.__test.addBlackListRule;
			getBlackList = mod.__test.getBlackList;
			clearBlackList = mod.__test.clearBlackList;
			clearBlackList();
		});

		it('adds a new IP to the blacklist', () => {
			addBlackListRule({ ip: '10.0.0.99', respId: -1, mark: 'test-block' });

			const bl = getBlackList();
			expect(bl.length).toBe(1);
			expect(bl[0].ip).toBe('10.0.0.99');
			expect(bl[0].mark).toBe('test-block');
		});

		it('deduplicates same IP', () => {
			addBlackListRule({ ip: '10.0.0.99', respId: -1, mark: 'first' });
			addBlackListRule({ ip: '10.0.0.99', respId: -1, mark: 'second' });

			const bl = getBlackList();
			expect(bl.length).toBe(1);
			expect(bl[0].mark).toBe('first');
		});

		it('adds multiple distinct IPs', () => {
			addBlackListRule({ ip: '10.0.0.1', respId: -1 });
			addBlackListRule({ ip: '10.0.0.2', respId: -1 });
			addBlackListRule({ ip: '10.0.0.3', respId: -1 });

			expect(getBlackList().length).toBe(3);
		});
	});

	describe('firewallProcess \u2014 non-status triggers block before Turnstile', () => {
		let firewallProcess: any;
		let setTriggers: any;
		let setRules: any;
		let clearBlackList: any;

		beforeEach(async () => {
			testIp = '10.0.0.1';
			const mod = await import('../../../src/lib/server/firewall');
			firewallProcess = mod.firewallProcess;
			setTriggers = mod.__test.setTriggers;
			setRules = mod.__test.setRules;
			clearBlackList = mod.__test.clearBlackList;
			setRules([]);
			setTriggers([]);
			clearBlackList();
		});

		afterEach(() => {
			// Restore default IP so other tests are unaffected
			testIp = '127.0.0.1';
			setRules([]);
			setTriggers([]);
		});

		it('blocks via trigger and skips Turnstile when rate limit exceeded', async () => {
			const trigger = new FWRule();
			trigger.id = 1;
			trigger.path = '/about';
			trigger.trigger = true;
			trigger.rate = '1/1';
			trigger.active = true;
			trigger.ip = '';
			trigger.respId = -1;
			trigger.country = '';
			trigger.method = '';
			trigger.headers = '';
			trigger.status = '';
			setTriggers([trigger]);

			// Dummy rule to prevent fwFilter from calling loadRules()
			// (which would reset triggers to empty)
			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/about'),
				url: new URL('http://localhost/about'),
				locals: { ip: '10.0.0.1' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			// Should be blocked by trigger (403), NOT Turnstile (418)
			expect(res.status).toBe(403);
		});

		it('passes through to Turnstile when no trigger matches', async () => {
			const event = {
				request: new Request('http://localhost/about'),
				url: new URL('http://localhost/about'),
				locals: { ip: '10.0.0.1' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			expect(res.status).toBe(418);
		});
	});

	describe('checkRedirect runs after fwFilter — adminer.php scenario', () => {
		let firewallProcess: any;
		let setRules: any;
		let setTriggers: any;
		let clearBlackList: any;

		beforeEach(async () => {
			testIp = '10.0.0.1';
			checkRedirectReturn = '/login';
			const mod = await import('../../../src/lib/server/firewall');
			firewallProcess = mod.firewallProcess;
			setRules = mod.__test.setRules;
			setTriggers = mod.__test.setTriggers;
			clearBlackList = mod.__test.clearBlackList;
			setRules([]);
			setTriggers([]);
			clearBlackList();
		});

		afterEach(() => {
			testIp = '127.0.0.1';
			checkRedirectReturn = '';
			setRules([]);
			setTriggers([]);
		});

		it('fwFilter rule blocks /adminer.php before checkRedirect redirects', async () => {
			const rule = new FWRule();
			rule.id = 100;
			rule.path = '/adminer.php';
			rule.respId = -1;
			rule.active = true;
			rule.ip = '';
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			rule.status = '';
			rule.trigger = false;
			setRules([rule as any]);

			const event = {
				request: new Request('http://localhost/adminer.php'),
				url: new URL('http://localhost/adminer.php'),
				locals: { ip: '10.0.0.1' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			// Should be blocked by rule (403), NOT redirected by checkRedirect (307)
			expect(res.status).toBe(403);
		});

		it('/adminer.php passes through when checkRedirect returns empty', async () => {
			checkRedirectReturn = '';

			const event = {
				request: new Request('http://localhost/adminer.php'),
				url: new URL('http://localhost/adminer.php'),
				locals: { ip: '10.0.0.1' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			// No firewall rule, checkRedirect returns '' — passes to handler
			expect(res.status).toBe(200);
		});
	});

	describe('triggersHit log flag — only on rate-limit action', () => {
		let firewallProcess: any;
		let getLogCacheEntries: any;
		let setTriggers: any;
		let setRules: any;
		let clearBlackList: any;

		beforeEach(async () => {
			testIp = '10.0.0.2';
			const mod = await import('../../../src/lib/server/firewall');
			firewallProcess = mod.firewallProcess;
			getLogCacheEntries = mod.getLogCacheEntries;
			setTriggers = mod.__test.setTriggers;
			setRules = mod.__test.setRules;
			clearBlackList = mod.__test.clearBlackList;
			setRules([]);
			setTriggers([]);
			clearBlackList();
		});

		afterEach(() => {
			testIp = '127.0.0.1';
			setRules([]);
			setTriggers([]);
		});

		it('does not set log flag on trigger match when rate limit is not exceeded', async () => {
			const trigger = new FWRule();
			trigger.id = 10;
			trigger.path = '/tag/some-slug';
			trigger.trigger = true;
			trigger.log = true;
			trigger.active = true;
			trigger.ip = '';
			trigger.respId = 0;
			trigger.country = '';
			trigger.method = '';
			trigger.headers = '';
			trigger.status = '';
			trigger.rate = '10/300'; // rate limit defined but only 1 request
			setTriggers([trigger]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/tag/some-slug'),
				url: new URL('http://localhost/tag/some-slug'),
				locals: { ip: '10.0.0.2' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			// Rate not exceeded → falls through to Turnstile
			expect(res.status).toBe(418);

			// Log flag should NOT be set — trigger didn't take action
			const entries = getLogCacheEntries();
			const last = entries[entries.length - 1];
			expect(last.path).toBe('/tag/some-slug');
			expect(last.log).toBeUndefined();
		});

		it('sets log flag when trigger rate limit is exceeded', async () => {
			const trigger = new FWRule();
			trigger.id = 12;
			trigger.path = '/tag/rate-hit';
			trigger.trigger = true;
			trigger.log = true;
			trigger.active = true;
			trigger.ip = '';
			trigger.respId = -1;
			trigger.country = '';
			trigger.method = '';
			trigger.headers = '';
			trigger.status = '';
			trigger.rate = '1/1'; // 1 request per 1s → first hit exceeds
			setTriggers([trigger]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/tag/rate-hit'),
				url: new URL('http://localhost/tag/rate-hit'),
				locals: { ip: '10.0.0.2' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			// Rate exceeded → blocked by trigger (403)
			expect(res.status).toBe(403);

			// Log flag should be set — trigger took action
			const entries = getLogCacheEntries();
			const last = entries[entries.length - 1];
			expect(last.path).toBe('/tag/rate-hit');
			expect(last.log).toBe(true);
		});

		it('does not set log flag when trigger has log disabled', async () => {
			const trigger = new FWRule();
			trigger.id = 11;
			trigger.path = '/tag/no-log-slug';
			trigger.trigger = true;
			trigger.log = false;
			trigger.active = true;
			trigger.ip = '';
			trigger.respId = 0;
			trigger.country = '';
			trigger.method = '';
			trigger.headers = '';
			trigger.status = '';
			trigger.rate = '';
			setTriggers([trigger]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/tag/no-log-slug'),
				url: new URL('http://localhost/tag/no-log-slug'),
				locals: { ip: '10.0.0.2' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			await firewallProcess(event, handle);

			const entries = getLogCacheEntries();
			const last = entries[entries.length - 1];
			expect(last.path).toBe('/tag/no-log-slug');
			expect(last.log).toBeUndefined();
		});
	});

	describe('Turnstile challenge records status on log', () => {
		let firewallProcess: any;
		let getLogCacheEntries: any;
		let setRules: any;
		let setTriggers: any;

		beforeEach(async () => {
			testIp = '10.0.0.3';
			const mod = await import('../../../src/lib/server/firewall');
			firewallProcess = mod.firewallProcess;
			getLogCacheEntries = mod.getLogCacheEntries;
			setRules = mod.__test.setRules;
			setTriggers = mod.__test.setTriggers;
			setRules([]);
			setTriggers([]);
		});

		afterEach(() => {
			testIp = '127.0.0.1';
			setRules([]);
			setTriggers([]);
		});

		it('records 418 status on log when Turnstile challenges /tag/xxx', async () => {
			const event = {
				request: new Request('http://localhost/tag/ts-test'),
				url: new URL('http://localhost/tag/ts-test'),
				locals: { ip: '10.0.0.3' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			expect(res.status).toBe(418);

			const entries = getLogCacheEntries();
			const last = entries[entries.length - 1];
			expect(last.path).toBe('/tag/ts-test');
			expect(last.status).toBe(418);
		});

		it('records 200 when Turnstile is bypassed (ts-challenge page itself)', async () => {
			const event = {
				request: new Request('http://localhost/ts-challenge?redirect=/tag/test'),
				url: new URL('http://localhost/ts-challenge?redirect=/tag/test'),
				locals: { ip: '10.0.0.3' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await firewallProcess(event, handle);

			expect(res.status).toBe(200);

			const entries = getLogCacheEntries();
			const last = entries[entries.length - 1];
			expect(last.path).toBe('/ts-challenge?redirect=/tag/test');
			expect(last.status).toBe(200);
		});
	});

	describe('checkRedirect regex', () => {
		it('tightened admin regex excludes /adminer.php but matches /admin', () => {
			// This reflects the fix in utils.ts: /^\/admin(\/|$)/i
			const adminRe = /^\/admin(\/|$)/i;
			expect(adminRe.test('/admin')).toBe(true);
			expect(adminRe.test('/admin/')).toBe(true);
			expect(adminRe.test('/admin/settings')).toBe(true);
			expect(adminRe.test('/adminer.php')).toBe(false);
			expect(adminRe.test('/administrator')).toBe(false);
			expect(adminRe.test('/Adminer.PHP')).toBe(false);
		});
	});

	describe('setup redirect to /config when sysStatue < 2', () => {
		beforeEach(async () => {
			testIp = '10.0.0.4';
		});

		afterEach(() => {
			testIp = '127.0.0.1';
		});

		it('redirects to /config when sysStatue is 0', async () => {
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				sysStatue: 0
			}));
			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);

			const event = {
				request: new Request('http://localhost/test-page'),
				url: new URL('http://localhost/test-page'),
				locals: { ip: '10.0.0.4' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await mod.firewallProcess(event, handle);

			expect(res.status).toBe(307);
			expect(res.headers.get('location')).toBe('/config');
		});

		it('passes through when already on /config', async () => {
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				sysStatue: 0
			}));
			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);

			const event = {
				request: new Request('http://localhost/config'),
				url: new URL('http://localhost/config'),
				locals: { ip: '10.0.0.4' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await mod.firewallProcess(event, handle);

			expect(res.status).toBe(200);
		});
	});

	describe('Abandon mode — model helpers', () => {
		it('getTimeout defaults to 3', () => {
			const rule = new FWRule();
			expect(rule.getTimeout()).toBe(3);
		});

		it('getTimeout clamps to 1-10', () => {
			const rule = new FWRule();
			rule.timeout = 0;
			expect(rule.getTimeout()).toBe(1);
			rule.timeout = 999;
			expect(rule.getTimeout()).toBe(10);
		});

		it('getUaWindow defaults to 60', () => {
			const rule = new FWRule();
			expect(rule.getUaWindow()).toBe(60);
		});

		it('getUaWindow clamps to 30-3600', () => {
			const rule = new FWRule();
			rule.uaWindow = 0;
			expect(rule.getUaWindow()).toBe(30);
			rule.uaWindow = 9999;
			expect(rule.getUaWindow()).toBe(3600);
		});
	});

	describe('markAbandon / clearAbandon timer management', () => {
		let markAbandon: any;
		let clearAbandon: any;
		let getPendingAbandons: any;
		let clearPendingAbandons: any;
		let getBlackList: any;
		let clearBlackList: any;

		beforeEach(async () => {
			const mod = await import('../../../src/lib/server/firewall');
			markAbandon = mod.__test.markAbandon;
			clearAbandon = mod.__test.clearAbandon;
			getPendingAbandons = mod.__test.getPendingAbandons;
			clearPendingAbandons = mod.__test.clearPendingAbandons;
			getBlackList = mod.__test.getBlackList;
			clearBlackList = mod.__test.clearBlackList;
			clearBlackList();
			clearPendingAbandons();
		});

		afterEach(() => {
			clearPendingAbandons();
			clearBlackList();
		});

		it('markAbandon starts timer and adds IP to blacklist after timeout', async () => {
			const rule = new FWRule();
			rule.timeout = 1;
			rule.mark = 'test-abandon';
			rule.respId = -1;
			rule.log = false;

			markAbandon('10.0.5.1', rule);

			const pending = getPendingAbandons();
			expect(pending.has('10.0.5.1')).toBe(true);

			await new Promise((r) => setTimeout(r, 1100));

			const bl = getBlackList();
			expect(bl.length).toBe(1);
			expect(bl[0].ip).toBe('10.0.5.1');
			expect(bl[0].mark).toBe('test-abandon');
		});

		it('clearAbandon cancels timer so IP is NOT blacklisted', async () => {
			const rule = new FWRule();
			rule.timeout = 1;
			rule.mark = 'test-abandon-clear';
			rule.respId = -1;

			markAbandon('10.0.5.2', rule);
			clearAbandon('10.0.5.2');

			const pending = getPendingAbandons();
			expect(pending.has('10.0.5.2')).toBe(false);

			await new Promise((r) => setTimeout(r, 1100));

			const bl = getBlackList();
			expect(bl.length).toBe(0);
		});

		it('multiple abandon rules for same IP tracked independently', async () => {
			const rule1 = new FWRule();
			rule1.timeout = 1;
			rule1.mark = 'rule-1';
			rule1.respId = -1;

			const rule2 = new FWRule();
			rule2.timeout = 2;
			rule2.mark = 'rule-2';
			rule2.respId = -1;

			markAbandon('10.0.5.3', rule1);
			markAbandon('10.0.5.3', rule2);

			const pending = getPendingAbandons();
			expect(pending.get('10.0.5.3').length).toBe(2);

			await new Promise((r) => setTimeout(r, 1100));
			let bl = getBlackList();
			expect(bl.length).toBe(1);
			expect(bl[0].mark).toBe('rule-1');

			const pending2 = getPendingAbandons();
			expect(pending2.get('10.0.5.3')?.length).toBe(1);

			await new Promise((r) => setTimeout(r, 1100));
			bl = getBlackList();
			expect(bl.length).toBe(1);

			expect(getPendingAbandons().has('10.0.5.3')).toBe(false);
		});
	});

	describe('Direct abandon filter test', () => {
		it('triggers.filter with abandon finds the rule in firewallProcess context', async () => {
			testIp = '10.0.8.1';
			mockSysStatue = 2;
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				get sysStatue() {
					return mockSysStatue;
				}
			}));
			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);
			mod.__test.clearPendingAbandons();

			const rule = new FWRule();
			rule.trigger = true;
			rule.abandon = true;
			rule.active = true;
			rule.ip = '';
			rule.path = '';
			rule.status = '';
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			mod.__test.setTriggers([rule]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			mod.__test.setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/post/direct'),
				url: new URL('http://localhost/post/direct'),
				locals: { ip: '10.0.8.1' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await mod.firewallProcess(event, handle);

			expect(mod.__test.getPendingAbandons().size).toBe(1);

			testIp = '127.0.0.1';
		});

		it('clears abandon when /ts-challenge page is loaded', async () => {
			testIp = '10.0.8.2';
			mockSysStatue = 2;
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				get sysStatue() {
					return mockSysStatue;
				}
			}));
			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);
			mod.__test.clearPendingAbandons();

			const rule = new FWRule();
			rule.id = 78;
			rule.trigger = true;
			rule.abandon = true;
			rule.timeout = 5;
			rule.active = true;
			rule.ip = '';
			rule.path = '';
			rule.status = '';
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			mod.__test.setTriggers([rule]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			mod.__test.setRules([dummy as any]);

			// Step 1: Request protected path
			const event1 = {
				request: new Request('http://localhost/about'),
				url: new URL('http://localhost/about'),
				locals: { ip: '10.0.8.2' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			await mod.firewallProcess(event1, handle);

			expect(mod.__test.getPendingAbandons().has('10.0.8.2')).toBe(true);

			// Step 2: Load /ts-challenge
			const event2 = {
				request: new Request('http://localhost/ts-challenge?redirect=/about'),
				url: new URL('http://localhost/ts-challenge?redirect=/about'),
				locals: { ip: '10.0.8.2' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			await mod.firewallProcess(event2, handle);

			expect(mod.__test.getPendingAbandons().has('10.0.8.2')).toBe(false);

			testIp = '127.0.0.1';
		});

		it('does NOT mark abandon for non-protected paths', async () => {
			testIp = '10.0.8.3';
			mockSysStatue = 2;
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				get sysStatue() {
					return mockSysStatue;
				}
			}));
			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);
			mod.__test.clearPendingAbandons();

			const rule = new FWRule();
			rule.id = 79;
			rule.trigger = true;
			rule.abandon = true;
			rule.timeout = 5;
			rule.active = true;
			rule.ip = '';
			rule.path = '';
			rule.status = '';
			rule.country = '';
			rule.method = '';
			rule.headers = '';
			mod.__test.setTriggers([rule]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			mod.__test.setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/api/test'),
				url: new URL('http://localhost/api/test'),
				locals: { ip: '10.0.8.3' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			await mod.firewallProcess(event, handle);

			expect(mod.__test.getPendingAbandons().has('10.0.8.3')).toBe(false);

			testIp = '127.0.0.1';
		});
	});

	describe('Whitelist — isIpWhitelisted and firewall bypass', () => {
		it('isIpWhitelisted returns true for exact IP match', async () => {
			const mod = await import('../../../src/lib/server/firewall');
			const { WhiteList } = await import('../../../src/lib/server/model');
			mod.__test.clearWhiteList();

			const w = new WhiteList();
			w.id = 1;
			w.ip = '10.0.9.1';
			w.mark = 'test-whitelist';
			(mod as any).saveWhiteList(w);

			const result = (mod as any).isIpWhitelisted('10.0.9.1');
			expect(result).toBe(true);

			mod.__test.clearWhiteList();
		});

		it('isIpWhitelisted returns false for unknown IP', async () => {
			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.clearWhiteList();
			expect((mod as any).isIpWhitelisted('10.0.9.99')).toBe(false);
		});

		it('delWhiteList removes IP from whitelist', async () => {
			const mod = await import('../../../src/lib/server/firewall');
			const { WhiteList } = await import('../../../src/lib/server/model');
			mod.__test.clearWhiteList();

			const w = new WhiteList();
			w.id = 2;
			w.ip = '10.0.9.2';
			w.mark = 'to-delete';
			(mod as any).saveWhiteList(w);

			expect((mod as any).isIpWhitelisted('10.0.9.2')).toBe(true);

			(mod as any).delWhiteList(2);
			expect((mod as any).isIpWhitelisted('10.0.9.2')).toBe(false);

			mod.__test.clearWhiteList();
		});

		it('whitelisted IP bypasses firewall and Turnstile', async () => {
			testIp = '10.0.9.3';
			mockSysStatue = 2;
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				get sysStatue() {
					return mockSysStatue;
				}
			}));

			const mod = await import('../../../src/lib/server/firewall');
			const { WhiteList } = await import('../../../src/lib/server/model');
			mod.__test.clearWhiteList();
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);

			// Add whitelist
			const w = new WhiteList();
			w.id = 3;
			w.ip = '10.0.9.3';
			(mod as any).saveWhiteList(w);

			// Dummy rule to prevent loadRules
			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			mod.__test.setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/about'),
				url: new URL('http://localhost/about'),
				locals: { ip: '10.0.9.3' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await mod.firewallProcess(event, handle);

			// Should pass through to handler (200), NOT Turnstile (418) or blacklist (403)
			expect(res.status).toBe(200);

			mod.__test.clearWhiteList();
			testIp = '127.0.0.1';
		});

		it('non-whitelisted IP on same path gets Turnstile challenge', async () => {
			testIp = '10.0.9.4';
			mockSysStatue = 2;
			mock.module('$lib/server/utils', () => ({
				checkRedirect: () => checkRedirectReturn,
				getClient: () => undefined,
				getClientAddr: () => testIp,
				model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
				get sysStatue() {
					return mockSysStatue;
				}
			}));

			const mod = await import('../../../src/lib/server/firewall');
			mod.__test.clearWhiteList();
			mod.__test.setRules([]);
			mod.__test.setTriggers([]);

			const dummy = new FWRule();
			dummy.id = 999;
			dummy.active = false;
			mod.__test.setRules([dummy as any]);

			const event = {
				request: new Request('http://localhost/about'),
				url: new URL('http://localhost/about'),
				locals: { ip: '10.0.9.4' },
				fetch: () => Promise.resolve(new Response())
			} as any;

			const handle = async () => new Response('ok', { status: 200 });
			const res = await mod.firewallProcess(event, handle);

			// Should be blocked by Turnstile (418)
			expect(res.status).toBe(418);

			testIp = '127.0.0.1';
		});
	});
});

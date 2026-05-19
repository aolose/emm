import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock SvelteKit modules
mock.module('$app/navigation', () => ({ goto: () => {} }));
mock.module('$app/environment', () => ({ browser: false }));
mock.module('$app/stores', () => ({ page: { subscribe: () => () => {} } }));

// Mock database for addRule / addBlackListRule tests
mock.module('$lib/server/index', () => ({
	db: { save: () => {}, all: () => [], delByPk: () => {} },
	sys: { maxFireLogs: 1000 },
}));

mock.module('$lib/server/utils', () => ({
	checkRedirect: () => undefined,
	getClient: () => undefined,
	getClientAddr: () => '127.0.0.1',
	model: (cls: any, data?: any) => Object.assign(new cls(), data || {}),
	sysStatue: 2,
}));

mock.module('$lib/server/ipLite', () => ({
	ipInfo: () => null,
	ipInfoStr: () => '',
}));

mock.module('$lib/server/puv', () => ({
	ruv: () => {},
}));

mock.module('$lib/enum', () => ({
	permission: { Admin: 0, Read: 1, Post: 2 },
	NULL: { INT: -1, TEXT: '-', DATE: new Date(0) },
}));

mock.module('$lib/utils', () => ({
	arrFilter: (a: any) => a,
	hasFwRuleFilter: () => false,
	hds2Str: () => '',
	str2Hds: () => [],
	trim: (s?: string) => (s || '').trim(),
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
});

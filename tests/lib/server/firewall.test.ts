import { describe, it, expect, mock } from 'bun:test';

// Mock SvelteKit modules
mock.module('$app/navigation', () => ({ goto: () => {} }));
mock.module('$app/environment', () => ({ browser: false }));
mock.module('$app/stores', () => ({ page: { subscribe: () => () => {} } }));

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

		it('single number match', () => {
			expect(isInRange('200', 200)).toBe(true);
			expect(isInRange('200', 404)).toBe(false);
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
});

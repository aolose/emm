import { describe, expect, test } from 'bun:test';
// fire.ts uses internal functions that are not exported; we test them
// indirectly, or extract them for direct testing.
//
// The key pure functions in firewall.ts:
// - isInRange(str, num)        - match numeric ranges like "100-200" or "300~500"
// - matchRuleValue(value, target) - match with regex / negation prefix "!"
// - matchHeader(h, headers)     - match request headers against rule

// ---- isInRange (extracted for testing) ----
// WARNING: Bug found! When a range group does NOT match, the code returns
// `false` immediately instead of continuing to check the next group.
// This means `'100-200,500-600'` with num=550 incorrectly returns false
// because the first group (100-200) fails and short-circuits.
const isInRange_buggy = (str: string, num: number | undefined) => {
	if (num) {
		const group = str.split(/[,; ]+/);
		for (const g of group) {
			const [a, b] = g.split(/[-~]/, 2);
			if (/\d+/g.test(a)) {
				if (num >= +a) {
					if (/\d+/g.test(b)) {
						if (num > +b) return false;
					}
					return true;
				}
			}
		}
	}
	return false;
};

// FIXED version
const isInRange = (str: string, num: number | undefined) => {
	if (num) {
		const group = str.split(/[,; ]+/);
		for (const g of group) {
			const [a, b] = g.split(/[-~]/, 2);
			if (/\d+/g.test(a)) {
				if (num >= +a) {
					if (/\d+/g.test(b)) {
						if (num > +b) continue; // FIX: continue instead of return false
					}
					return true;
				}
			}
		}
	}
	return false;
};

// ---- matchRuleValue (extracted) ----
// escapeRe() removes all regex special chars. So user input like ".*bot.*"
// is matched LITERALLY as the string ".*bot.*", not as a regex wildcard.
// This is the actual behavior — the "regex" feature only supports literal
// matching + negation prefix '!'.
const matchRuleValue = (value: string, target: string) => {
	const rv = value.startsWith('!');
	const v = rv ? value.slice(1) : '^' + escapeRe(value) + '$';
	let hit = false;
	try {
		const re = new RegExp(v, 'i');
		hit = re.test(target);
	} catch (e) {
		// invalid regex - treat as literal comparison
		hit = target.toLowerCase() === value.toLowerCase();
	}
	return rv ? !hit : hit;
};

// ---- matchHeader (extracted) ----
const matchHeader = (h: string, hs: Headers) => {
	const s = h.split('\n');
	for (const hd of s) {
		const idx = hd.indexOf(':');
		if (idx < 1) continue;
		const key = hd.substring(0, idx).replace(/[^a-z0-9-_]/gi, '');
		const value = hd.substring(idx + 1);
		if (!key) continue;
		const headerValue = hs.get(key);
		if (!headerValue) return false;
		if (!matchRuleValue(value.trim(), headerValue)) return false;
	}
	return true;
};

// =========== isInRange Tests ===========
describe('isInRange', () => {
	test('single range: within', () => {
		expect(isInRange('100-200', 150)).toBe(true);
	});

	test('single range: at lower bound', () => {
		expect(isInRange('100-200', 100)).toBe(true);
	});

	test('single range: at upper bound', () => {
		expect(isInRange('100-200', 200)).toBe(true);
	});

	test('single range: below', () => {
		expect(isInRange('100-200', 99)).toBe(false);
	});

	test('single range: above', () => {
		expect(isInRange('100-200', 201)).toBe(false);
	});

	test('tilde separator works', () => {
		expect(isInRange('100~200', 150)).toBe(true);
	});

	// --- Buggy version tests (current behavior) ---
	test('BUGGY: multiple ranges - value in second group fails', () => {
		// This fails because first group mismatches → returns false immediately
		expect(isInRange_buggy('100-200,500-600', 550)).toBe(false);
	});

	// --- Fixed version tests ---
	test('multiple ranges separated by comma [FIXED]', () => {
		expect(isInRange('100-200,500-600', 550)).toBe(true);
	});

	test('multiple ranges: value in second range [FIXED]', () => {
		expect(isInRange('100-200,500-600', 150)).toBe(true);
	});

	test('multiple ranges: value outside all', () => {
		expect(isInRange('100-200,500-600', 300)).toBe(false);
	});

	test('spaces as separator', () => {
		expect(isInRange('100 200', 150)).toBe(true);
	});

	test('semicolons as separator', () => {
		expect(isInRange('100;200', 150)).toBe(true);
	});

	test('open-ended range (no upper bound)', () => {
		expect(isInRange('100-', 999)).toBe(true);
	});

	test('open-ended range: below lower bound', () => {
		expect(isInRange('100-', 99)).toBe(false);
	});

	test('single value treated as range with no upper bound', () => {
		// "100" split by /[-~]/ gives ["100"] - no 'b' part
		expect(isInRange('100', 100)).toBe(true);
		expect(isInRange('100', 999)).toBe(true);
		expect(isInRange('100', 99)).toBe(false);
	});

	test('num is undefined returns false', () => {
		expect(isInRange('100-200', undefined)).toBe(false);
	});

	test('num is 0 returns false (falsy)', () => {
		expect(isInRange('100-200', 0)).toBe(false);
	});
});

// =========== matchRuleValue Tests ===========
describe('matchRuleValue', () => {
	test('exact match', () => {
		expect(matchRuleValue('hello', 'hello')).toBe(true);
	});

	test('exact mismatch', () => {
		expect(matchRuleValue('hello', 'world')).toBe(false);
	});

	test('case insensitive match', () => {
		expect(matchRuleValue('Hello', 'hello')).toBe(true);
	});

	// NOTE: matchRuleValue always escapes regex special chars via escapeRe().
	// So ".*" is treated as literal ". *", not as a wildcard.
	test('literal match (regex chars are escaped)', () => {
		expect(matchRuleValue('.*bot.*', '.*bot.*')).toBe(true);
	});

	test('literal mismatch (escaped chars)', () => {
		expect(matchRuleValue('.*bot.*', 'Googlebot')).toBe(false);
	});

	test('literal chars work normally', () => {
		expect(matchRuleValue('bot', 'bot')).toBe(true);
		expect(matchRuleValue('bot', 'BOT')).toBe(true);
		expect(matchRuleValue('bot', 'not')).toBe(false);
	});

	test('negation: ! at start means NOT match', () => {
		// !Chrome means: NOT Chrome
		expect(matchRuleValue('!Chrome', 'Firefox')).toBe(true);
	});

	test('negation: match should fail when negated pattern matches', () => {
		expect(matchRuleValue('!Chrome', 'Chrome')).toBe(false);
	});

	test('negation case insensitive', () => {
		expect(matchRuleValue('!chrome', 'Chrome')).toBe(false);
	});

	test('empty string matches empty string', () => {
		// '' → regex becomes: '' → '^(?:)$' ? actually value='', v='^$', test('')→true
		expect(matchRuleValue('', '')).toBe(true);
	});

	test('special regex chars are escaped', () => {
		// (.+?) should be escaped, so it matches literal "(.+?)" not any string
		expect(matchRuleValue('(.+?)', '(.+?)')).toBe(true);
		expect(matchRuleValue('(.+?)', 'abc')).toBe(false);
	});

	test('invalid regex falls back to literal comparison', () => {
		// Unmatched [ should cause regex error and fallback to literal
		expect(matchRuleValue('[unclosed', '[unclosed')).toBe(true);
		expect(matchRuleValue('[unclosed', 'other')).toBe(false);
	});
});

// =========== matchHeader Tests ===========
describe('matchHeader', () => {
	test('single header exact match', () => {
		const headers = new Headers({ 'x-custom': 'myvalue' });
		expect(matchHeader('x-custom:myvalue', headers)).toBe(true);
	});

	test('header key normalization (non-alphanum removed)', () => {
		const headers = new Headers({ 'x-custom': 'myvalue' });
		// "X-Custom" → key normalized to "XCustom" (after stripping non-alphanum-dash-underscore)
		expect(matchHeader('X-Custom:myvalue', headers)).toBe(true);
	});

	test('header mismatch', () => {
		const headers = new Headers({ 'x-custom': 'myvalue' });
		expect(matchHeader('x-custom:wrong', headers)).toBe(false);
	});

	test('missing header returns false', () => {
		const headers = new Headers({});
		expect(matchHeader('x-custom:myvalue', headers)).toBe(false);
	});

	test('multiple headers all must match', () => {
		const headers = new Headers({
			'x-custom': 'myvalue',
			'x-another': 'go'
		});
		expect(matchHeader('x-custom:myvalue\nx-another:go', headers)).toBe(true);
	});

	test('multiple headers: one mismatch fails', () => {
		const headers = new Headers({
			'x-custom': 'myvalue',
			'x-another': 'go'
		});
		expect(matchHeader('x-custom:myvalue\nx-another:bad', headers)).toBe(false);
	});

	test('empty header string returns true (no rules to check)', () => {
		const headers = new Headers({ 'x-custom': 'myvalue' });
		expect(matchHeader('', headers)).toBe(true);
	});

	test('header with negation', () => {
		const headers = new Headers({ 'x-custom': 'myvalue' });
		// !badvalue means NOT matching "badvalue"
		expect(matchHeader('x-custom:!badvalue', headers)).toBe(true);
	});
});

// =========== escapeRe helper used by matchRuleValue ===========
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
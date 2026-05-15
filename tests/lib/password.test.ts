import { describe, it, expect } from 'bun:test';
import { enc, legacyEnc, setPwdSalt } from '../../src/lib/utils';

describe('Password hashing', () => {
	describe('enc() — without per-instance salt (legacy mode)', () => {
		it('produces deterministic output', async () => {
			const a = await enc('hello');
			const b = await enc('hello');
			expect(a).toBe(b);
		});

		it('produces different output for different input', async () => {
			const a = await enc('hello');
			const b = await enc('world');
			expect(a).not.toBe(b);
		});

		it('output is non-empty string', async () => {
			const h = await enc('test');
			expect(typeof h).toBe('string');
			expect(h.length).toBeGreaterThan(0);
		});
	});

	describe('enc() — with per-instance salt (upgraded mode)', () => {
		it('produces different hash than legacy mode for same input', async () => {
			const legacy = await legacyEnc('secret');
			setPwdSalt('custom-salt-12345');
			const upgraded = await enc('secret');
			expect(legacy).not.toBe(upgraded);
		});

		it('produces different output for different salts', async () => {
			setPwdSalt('salt-A');
			const a = await enc('secret');
			setPwdSalt('salt-B');
			const b = await enc('secret');
			expect(a).not.toBe(b);
		});
	});

	describe('legacyEnc()', () => {
		it('always uses hardcoded salt regardless of setPwdSalt', async () => {
			setPwdSalt('new-salt');
			const legacy = await legacyEnc('password');
			setPwdSalt('');
			const legacy2 = await legacyEnc('password');
			expect(legacy).toBe(legacy2);
		});

		it('matches original enc() behavior', async () => {
			setPwdSalt('');
			const viaEnc = await enc('test');
			const viaLegacy = await legacyEnc('test');
			expect(viaEnc).toBe(viaLegacy);
		});

		it('is deterministic', async () => {
			const a = await legacyEnc('abc');
			const b = await legacyEnc('abc');
			expect(a).toBe(b);
		});
	});

	describe('setPwdSalt()', () => {
		it('clearing salt restores legacy mode', async () => {
			setPwdSalt('temp-salt');
			await enc('x');
			setPwdSalt('');
			const a = await enc('test');
			const b = await legacyEnc('test');
			expect(a).toBe(b);
		});
	});
});

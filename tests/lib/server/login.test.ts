/**
 * Login flow test — validates the double-encryption login protocol.
 *
 * Run: bun test tests/lib/server/login.test.ts
 */
import { describe, it, expect } from 'bun:test';
import { enc, setPwdSalt, randNum } from '../../../src/lib/crypto';
import { Database } from 'bun:sqlite';

const USERNAME = 'tom';
const PASSWORD = '123qwe';

async function loadStored() {
	const db = new Database('blog.db');
	const row = db.query('SELECT admUsr, admPwd, pwdSalt FROM System WHERE id=1').values()[0];
	db.close();
	return { admUsr: row[0], admPwd: row[1], pwdSalt: row[2] };
}

/** Simulate client-side: enc(enc(input) + v) */
async function clientEnc(input: string, v: number) {
	return await enc((await enc(input)) + v);
}

describe('Login protocol', () => {
	it('correct credentials should match', async () => {
		const { admUsr, admPwd, pwdSalt } = await loadStored();
		setPwdSalt(pwdSalt);

		const v = randNum();
		const clientUsr = await clientEnc(USERNAME, v);
		const clientPwd = await clientEnc(PASSWORD, v);

		// Server-side verification
		const serverUsr = await enc(admUsr + v);
		const serverPwd = await enc(admPwd + v);

		expect(clientUsr).toBe(serverUsr);
		expect(clientPwd).toBe(serverPwd);
	});

	it('wrong password should not match', async () => {
		const { admUsr, admPwd, pwdSalt } = await loadStored();
		setPwdSalt(pwdSalt);

		const v = randNum();
		const clientUsr = await clientEnc(USERNAME, v);
		const clientPwd = await clientEnc('wrong-password', v);

		const serverUsr = await enc(admUsr + v);
		const serverPwd = await enc(admPwd + v);

		expect(clientUsr).toBe(serverUsr);
		expect(clientPwd).not.toBe(serverPwd);
	});

	it('wrong username should not match', async () => {
		const { admUsr, admPwd, pwdSalt } = await loadStored();
		setPwdSalt(pwdSalt);

		const v = randNum();
		const clientUsr = await clientEnc('wrong-user', v);
		const clientPwd = await clientEnc(PASSWORD, v);

		const serverUsr = await enc(admUsr + v);
		const serverPwd = await enc(admPwd + v);

		expect(clientUsr).not.toBe(serverUsr);
		expect(clientPwd).toBe(serverPwd);
	});

	it('different salt produces different hash', async () => {
		const { pwdSalt } = await loadStored();
		setPwdSalt(pwdSalt);
		const enc1 = await enc(USERNAME);

		// Without salt, uses legacy SHA-256
		setPwdSalt('');
		const enc2 = await enc(USERNAME);

		expect(enc1).not.toBe(enc2);
	});

	it('same input same salt produces deterministic hash', async () => {
		const { pwdSalt } = await loadStored();
		setPwdSalt(pwdSalt);
		const e1 = await enc(USERNAME);
		const e2 = await enc(USERNAME);
		expect(e1).toBe(e2);
	});
});

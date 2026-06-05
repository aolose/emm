import { describe, it, expect, mock } from 'bun:test';

// Mocks for getReqJson's dependencies
mock.module('$lib/server/crypto', () => ({
	keyPool: new Map(),
	genPubKey: async () => new ArrayBuffer(0)
}));

mock.module('$lib/server/index', () => ({
	db: {} as any,
	server: { maintain: false },
	sys: null as any
}));

const { getReqJson } = await import('../../../src/lib/server/utils');

describe('getReqJson', () => {
	it('parses plain JSON request with content-type header', async () => {
		const req = new Request('http://localhost/api/test', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ usr: 'admin', pwd: 'secret' })
		});

		const result = await getReqJson(req);
		expect(result).toEqual({ usr: 'admin', pwd: 'secret' });
	});

	it('parses plain JSON without content-type header', async () => {
		const req = new Request('http://localhost/api/test', {
			method: 'POST',
			body: JSON.stringify({ foo: 'bar' })
		});

		const result = await getReqJson(req);
		expect(result).toEqual({ foo: 'bar' });
	});

	it('parses plain JSON with octet-stream content-type (no encrypt header)', async () => {
		const req = new Request('http://localhost/api/test', {
			method: 'POST',
			headers: { 'content-type': 'application/octet-stream' },
			body: JSON.stringify({ key: 'value' })
		});

		const result = await getReqJson(req);
		expect(result).toEqual({ key: 'value' });
	});
});

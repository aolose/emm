/**
 * R2 End-to-End Test
 *
 * Verifies R2 credentials and bucket are functional by performing
 * a full write/read/delete roundtrip against Cloudflare R2.
 *
 * Usage:
 *   bun run scripts/test-r2.ts
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Config — same as migrate-to-r2.ts
// ---------------------------------------------------------------------------

function readR2Config() {
	const dbCfg = resolve('.dbCfg');
	if (!existsSync(dbCfg)) {
		console.error('ERROR: .dbCfg not found — run from project root');
		process.exit(1);
	}
	const dbPath = readFileSync(dbCfg, 'utf-8').trim();
	const db = new Database(dbPath);
	const sys = db.query('SELECT * FROM System WHERE id = 1').get() as Record<string, unknown>;
	db.close();

	return {
		accountId: (sys?.r2AccountId as string) || '',
		accessKey: (sys?.r2AccessKeyId as string) || '',
		secretKey: (sys?.r2SecretAccessKey as string) || '',
		bucket: (sys?.r2Bucket as string) || '',
		publicDomain: (sys?.r2PublicDomain as string) || ''
	};
}

// ---------------------------------------------------------------------------
// S3 Signature V4
// ---------------------------------------------------------------------------

async function sha256(data: string | Uint8Array): Promise<string> {
	const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	const hash = await crypto.subtle.digest('SHA-256', buf);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function hmac256(key: Uint8Array, data: string): Promise<Uint8Array> {
	const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign'
	]);
	const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
	return new Uint8Array(sig);
}

async function sign(method: string, keyPath: string, buf: Uint8Array, ct: string) {
	const cfg = readR2Config();
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);
	const region = 'auto';
	const service = 's3';
	const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
	const uri = `/${cfg.bucket}/${encodeURIComponent(keyPath).replace(/%2F/g, '/')}`;
	const payloadHash = method === 'PUT' ? await sha256(buf) : 'UNSIGNED-PAYLOAD';

	const names = ['host', 'x-amz-content-sha256', 'x-amz-date'];
	if (ct && method === 'PUT') names.push('content-type');
	names.sort();

	const ch = names
		.map((h) => {
			const v =
				h === 'host'
					? host
					: h === 'x-amz-content-sha256'
						? payloadHash
						: h === 'x-amz-date'
							? amzDate
							: ct;
			return `${h}:${v}`;
		})
		.join('\n');

	const sh = names.join(';');
	const cr = [method, uri, '', ch + '\n', sh, payloadHash].join('\n');
	const scope = `${dateStamp}/${region}/${service}/aws4_request`;
	const sts = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(cr)].join('\n');

	const kDate = await hmac256(new TextEncoder().encode('AWS4' + cfg.secretKey), dateStamp);
	const kRegion = await hmac256(kDate, region);
	const kService = await hmac256(kRegion, service);
	const sk = await hmac256(kService, 'aws4_request');
	const sig = Array.from(new Uint8Array(await hmac256(sk, sts)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	const hdrs: Record<string, string> = {
		Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${sh}, Signature=${sig}`,
		'x-amz-date': amzDate,
		'x-amz-content-sha256': payloadHash
	};
	if (ct && method === 'PUT') hdrs['content-type'] = ct;
	return hdrs;
}

function r2Url(keyPath: string): string {
	const cfg = readR2Config();
	return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${encodeURIComponent(keyPath).replace(/%2F/g, '/')}`;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function pass(label: string) {
	passed++;
	console.log(`  ✓ ${label}`);
}

function fail(label: string, detail?: string) {
	failed++;
	console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function put(key: string, body: string | Uint8Array, ct = ''): Promise<boolean> {
	const buf = typeof body === 'string' ? new TextEncoder().encode(body) : body;
	const hdrs = await sign('PUT', key, buf, ct);
	const res = await fetch(r2Url(key), {
		method: 'PUT',
		headers: hdrs,
		body: buf,
		signal: AbortSignal.timeout(15000)
	});
	return res.ok;
}

async function head(key: string): Promise<boolean> {
	const hdrs = await sign('HEAD', key, new Uint8Array(0), '');
	const res = await fetch(r2Url(key), {
		method: 'HEAD',
		headers: hdrs,
		signal: AbortSignal.timeout(10000)
	});
	return res.ok;
}

async function del(key: string): Promise<boolean> {
	const hdrs = await sign('DELETE', key, new Uint8Array(0), '');
	const res = await fetch(r2Url(key), {
		method: 'DELETE',
		headers: hdrs,
		signal: AbortSignal.timeout(10000)
	});
	return res.ok || res.status === 404;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function main() {
	const cfg = readR2Config();
	console.log('R2 E2E Test');
	console.log(`  Account:  ${cfg.accountId}`);
	console.log(`  Bucket:   ${cfg.bucket}`);
	console.log(`  Public:   ${cfg.publicDomain}`);
	console.log('');

	if (!cfg.accountId || !cfg.accessKey || !cfg.secretKey || !cfg.bucket) {
		console.error('ERROR: R2 not configured. Run scripts/set-r2-config.ts first.');
		process.exit(1);
	}

	const testKey = `__test__/e2e-${Date.now()}.txt`;
	const testBody = 'Hello from R2 E2E test!';

	// ── Test 1: PUT ──
	console.log('1. PUT (upload)');
	const ok = await put(testKey, testBody, 'text/plain');
	if (ok) pass('PUT succeeded');
	else fail('PUT failed');

	// ── Test 2: HEAD ──
	console.log('2. HEAD (exists)');
	const exists = await head(testKey);
	if (exists) pass('HEAD confirmed file exists');
	else fail('HEAD failed');

	// ── Test 3: PUT image ──
	console.log('3. PUT image/webp');
	const img = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]); // RIFF header
	const imgKey = `__test__/e2e-${Date.now()}.webp`;
	const imgOk = await put(imgKey, img, 'image/webp');
	if (imgOk) pass('PUT image succeeded');
	else fail('PUT image failed');

	// ── Test 4: HEAD image ──
	console.log('4. HEAD image');
	const imgExists = await head(imgKey);
	if (imgExists) pass('HEAD image exists');
	else fail('HEAD image failed');

	// ── Test 5: Public access ──
	console.log('5. Public URL');
	if (cfg.publicDomain) {
		const publicUrl = `${cfg.publicDomain}/${imgKey}`;
		try {
			const res = await fetch(publicUrl, { signal: AbortSignal.timeout(10000) });
			if (res.ok) pass(`Public URL accessible: ${res.status}`);
			else fail('Public URL not accessible', `status ${res.status}`);
		} catch {
			fail('Public URL not reachable', 'check r2PublicDomain and bucket public access');
		}
	} else {
		console.log('  - skipped (no public domain configured)');
	}

	// ── Test 6: DELETE ──
	console.log('6. DELETE');
	const d1 = await del(testKey);
	const d2 = await del(imgKey);
	if (d1 && d2) pass('DELETE succeeded');
	else fail('DELETE failed');

	// ── Test 7: HEAD after DELETE ──
	console.log('7. HEAD after delete');
	const gone1 = await head(testKey);
	const gone2 = await head(imgKey);
	if (!gone1 && !gone2) pass('Files confirmed deleted');
	else fail('Files still exist after delete');

	// ── Summary ──
	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed) process.exit(1);
}

main().catch((e) => {
	console.error('\nFATAL:', e);
	process.exit(1);
});

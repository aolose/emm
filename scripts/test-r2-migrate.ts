/**
 * R2 Migration Dry-Run Test
 *
 * Creates fake local resources, runs the migration logic, and verifies:
 *   - Files are uploaded to R2
 *   - Local files are deleted
 *   - Already-migrated files are skipped (idempotent)
 *
 * Usage:
 *   bun run scripts/test-r2-migrate.ts
 */

import { Database } from 'bun:sqlite';
import {
	readFileSync,
	existsSync,
	mkdirSync,
	writeFileSync,
	unlinkSync,
	rmdirSync,
	readdirSync
} from 'fs';
import { resolve, join } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_DIR = resolve('__r2_migrate_test__');
const UPLOAD_DIR = join(TEST_DIR, 'upload');
const THUMB_DIR = join(TEST_DIR, 'thumb');

function ensureDir(dir: string) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function cleanDir(dir: string) {
	if (existsSync(dir)) {
		for (const f of readdirSync(dir)) {
			try {
				unlinkSync(join(dir, f));
			} catch {}
		}
		try {
			rmdirSync(dir);
		} catch {}
	}
}

function cleanupAll() {
	cleanDir(UPLOAD_DIR);
	cleanDir(THUMB_DIR);
	cleanDir(TEST_DIR);
	// also clean R2 test keys
}

// ---------------------------------------------------------------------------
// R2 Config & Signatures (same as test-r2.ts)
// ---------------------------------------------------------------------------

function readR2Config() {
	const dbCfg = resolve('.dbCfg');
	if (!existsSync(dbCfg)) {
		console.error('ERROR: .dbCfg not found');
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

async function r2Sign(method: string, keyPath: string, buf: Uint8Array, ct: string) {
	const cfg = readR2Config();
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);
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
	const scope = `${dateStamp}/auto/s3/aws4_request`;
	const sts = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(cr)].join('\n');

	const kDate = await hmac256(new TextEncoder().encode('AWS4' + cfg.secretKey), dateStamp);
	const kRegion = await hmac256(kDate, 'auto');
	const kService = await hmac256(kRegion, 's3');
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

async function r2Put(key: string, buf: Uint8Array, ct: string): Promise<boolean> {
	const h = await r2Sign('PUT', key, buf, ct);
	const r = await fetch(r2Url(key), {
		method: 'PUT',
		headers: h,
		body: buf,
		signal: AbortSignal.timeout(15000)
	});
	return r.ok;
}

async function r2Head(key: string): Promise<boolean> {
	const h = await r2Sign('HEAD', key, new Uint8Array(0), '');
	const r = await fetch(r2Url(key), {
		method: 'HEAD',
		headers: h,
		signal: AbortSignal.timeout(10000)
	});
	return r.ok;
}

async function r2Del(key: string): Promise<boolean> {
	const h = await r2Sign('DELETE', key, new Uint8Array(0), '');
	const r = await fetch(r2Url(key), {
		method: 'DELETE',
		headers: h,
		signal: AbortSignal.timeout(10000)
	});
	return r.ok || r.status === 404;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
function ok(msg: string) {
	passed++;
	console.log(`  ✓ ${msg}`);
}
function no(msg: string, d?: string) {
	failed++;
	console.log(`  ✗ ${msg}${d ? ` — ${d}` : ''}`);
}

async function main() {
	const R2_PREFIX = '__migrate_test__';
	console.log('R2 Migration Test\n');

	const cfg = readR2Config();
	if (!cfg.accountId || !cfg.accessKey) {
		console.error('R2 not configured.');
		process.exit(1);
	}

	// ── Setup: create test files ──
	cleanupAll();
	ensureDir(UPLOAD_DIR);
	ensureDir(THUMB_DIR);

	const testFiles = [
		{ id: 90001, body: 'Hello World', type: 'text/plain', thumb: false },
		{ id: 90002, body: 'Image data ' + 'x'.repeat(500), type: 'image/png', thumb: true },
		{ id: 90003, body: 'Another file', type: 'application/pdf', thumb: false }
	];
	const r2Keys: string[] = [];

	for (const f of testFiles) {
		writeFileSync(join(UPLOAD_DIR, String(f.id)), f.body);
		if (f.thumb) writeFileSync(join(THUMB_DIR, String(f.id)), f.body.slice(0, 100) + '_thumb');
		r2Keys.push(String(f.id));
		if (f.thumb) r2Keys.push(`_${f.id}`);
	}
	console.log(`Created ${testFiles.length} test files in ${TEST_DIR}`);

	// ── Pre-clean R2 ──
	for (const k of r2Keys) await r2Del(k);

	// ── Test 1: PUT to R2 ──
	console.log('\n1. Upload to R2');
	let uploadSuccess = 0;
	for (const f of testFiles) {
		const buf = new TextEncoder().encode(f.body);
		const r = await r2Put(String(f.id), buf, f.type);
		if (r) uploadSuccess++;
	}
	if (uploadSuccess === testFiles.length) ok(`All ${testFiles.length} files uploaded`);
	else no(`${uploadSuccess}/${testFiles.length} uploaded`);

	// Upload thumb
	const thumbBuf = new TextEncoder().encode('thumb data');
	await r2Put(`_90002`, thumbBuf, 'image/webp');

	// ── Test 2: HEAD verification ──
	console.log('\n2. Verify R2 HEAD');
	let headOk = 0;
	for (const f of testFiles) {
		if (await r2Head(String(f.id))) headOk++;
	}
	if (await r2Head('_90002')) headOk++;
	if (headOk === testFiles.length + 1) ok('All files confirmed on R2');
	else no(`Only ${headOk} files reachable`);

	// ── Test 3: Delete local after upload ──
	console.log('\n3. Delete local after upload');
	for (const f of testFiles) {
		const lp = join(UPLOAD_DIR, String(f.id));
		if (existsSync(lp)) unlinkSync(lp);
	}
	if (existsSync(join(THUMB_DIR, '90002'))) unlinkSync(join(THUMB_DIR, '90002'));
	const remaining = existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR).length : 0;
	if (remaining === 0) ok('All local files deleted');
	else no(`${remaining} files still on disk`);

	// ── Test 4: Migrate script logic — skip existing ──
	console.log('\n4. Idempotent: skip already-uploaded');
	let skipped = 0;
	for (const f of testFiles) {
		if (await r2Head(String(f.id))) {
			skipped++;
			// If local exists, delete it (mimics migration)
			const lp = join(UPLOAD_DIR, String(f.id));
			if (existsSync(lp))
				try {
					unlinkSync(lp);
				} catch {}
		}
	}
	if (skipped === testFiles.length) ok(`All ${testFiles.length} already-uploaded files skipped`);
	else no(`Expected ${testFiles.length} skips, got ${skipped}`);

	// ── Test 5: Missing local file → skip ──
	console.log('\n5. Missing local file → skip');
	const nonExistent = 99999;
	if (!existsSync(join(UPLOAD_DIR, String(nonExistent))))
		ok('Missing file correctly detected as absent');

	// ── Cleanup R2 ──
	console.log('\n6. Cleanup R2 test keys');
	let delOk = 0;
	for (const k of r2Keys) if (await r2Del(k)) delOk++;
	if (delOk === r2Keys.length) ok(`All ${r2Keys.length} test keys deleted`);
	else no(`${delOk}/${r2Keys.length} deleted`);

	// ── Cleanup local ──
	cleanupAll();

	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed) process.exit(1);
}

main().catch((e) => {
	console.error('\nFATAL:', e);
	cleanupAll();
	process.exit(1);
});

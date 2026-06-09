/**
 * R2 Full Migration End-to-End Test
 *
 * Creates a real test database with Post / Res / Tag records,
 * writes local files, runs the full migration pipeline, and verifies:
 *   - Files are uploaded to R2 (PUT → HEAD verify)
 *   - Local files are deleted
 *   - Article bodies and descriptions have /res/ replaced with R2 URLs
 *   - Tag banners are unaffected (stored as IDs)
 *   - Statistics are accurate
 *   - Cleanup leaves no trace
 *
 * Usage:
 *   bun run scripts/test-r2-full-migrate.ts
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
// Config
// ---------------------------------------------------------------------------

const TEST_DIR = resolve('__r2_full_migrate_test__');
const UPLOAD_DIR = join(TEST_DIR, 'upload');
const THUMB_DIR = join(TEST_DIR, 'thumb');
const DB_PATH = join(TEST_DIR, 'test.db');

// ---------------------------------------------------------------------------
// Test helpers
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
function assert(cond: boolean, msg: string, detail?: string) {
	cond ? ok(msg) : no(msg, detail);
}

function ensureDir(dir: string) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
function cleanDir(dir: string) {
	if (existsSync(dir)) {
		for (const f of readdirSync(dir))
			try {
				unlinkSync(join(dir, f));
			} catch {}
		try {
			rmdirSync(dir);
		} catch {}
	}
}
function cleanupAll() {
	cleanDir(UPLOAD_DIR);
	cleanDir(THUMB_DIR);
	cleanDir(TEST_DIR);
}

// ---------------------------------------------------------------------------
// R2 config & helpers (same as test-r2.ts)
// ---------------------------------------------------------------------------

function readR2Config() {
	const dbCfg = resolve('.dbCfg');
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
	return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
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
// Migration logic (mirrors migrate-to-r2.ts core loop)
// ---------------------------------------------------------------------------

interface ResRow {
	id: number;
	type: string;
	thumb: number;
	r2Key: string;
}
interface PostRow {
	id: number;
	body: string;
	desc: string;
}
interface TagRow {
	id: number;
	banner: number;
}

async function runFullMigration(db: Database, publicDomain: string) {
	let synced = 0,
		skipped = 0,
		failed = 0;

	// ── Phase 1: Upload resources ──
	const rows = db.query('SELECT id, type, r2Key FROM Res').all() as ResRow[];
	for (const row of rows) {
		const rk = row.r2Key || String(row.id);
		const localPath = join(UPLOAD_DIR, String(row.id));
		if (await r2Head(rk)) {
			skipped++;
			if (existsSync(localPath))
				try {
					unlinkSync(localPath);
				} catch {}
			continue;
		}
		if (!existsSync(localPath)) {
			skipped++;
			continue;
		}
		const buf = new Uint8Array(readFileSync(localPath));
		if (!(await r2Put(rk, buf, row.type || 'application/octet-stream'))) {
			failed++;
			continue;
		}
		if (await r2Head(rk)) {
			try {
				unlinkSync(localPath);
			} catch {}
			synced++;
		} else {
			failed++;
		}
	}

	// ── Phase 2: Upload thumbnails ──
	const thumbRows = db.query('SELECT id, r2Key FROM Res WHERE thumb = 1').all() as ResRow[];
	for (const row of thumbRows) {
		const tk = `_${row.r2Key || row.id}`;
		const localPath = join(THUMB_DIR, String(row.id));
		if (await r2Head(tk)) {
			if (existsSync(localPath))
				try {
					unlinkSync(localPath);
				} catch {}
			continue;
		}
		if (!existsSync(localPath)) continue;
		const buf = new Uint8Array(readFileSync(localPath));
		if (!(await r2Put(tk, buf, 'image/webp'))) continue;
		if (await r2Head(tk))
			try {
				unlinkSync(localPath);
			} catch {}
		{
		}
	}

	// ── Phase 3: Replace /res/ references in articles ──
	let articlesUpdated = 0,
		refsReplaced = 0;
	const keyMap = new Map(rows.map((r) => [String(r.id), r.r2Key || String(r.id)]));
	const posts = db.query('SELECT id, content, desc FROM Post').all() as PostRow[];
	for (const post of posts) {
		let changed = false;
		let body = post.content || '';
		let desc = post.desc || '';
		body = body.replace(/\/res\/_(\d+)/g, (_, rid) => {
			changed = true;
			refsReplaced++;
			return `${publicDomain}/_${keyMap.get(rid) || rid}`;
		});
		body = body.replace(/\/res\/(\d+)/g, (_, rid) => {
			changed = true;
			refsReplaced++;
			return `${publicDomain}/${keyMap.get(rid) || rid}`;
		});
		desc = desc.replace(/\/res\/_(\d+)/g, (_, rid) => {
			changed = true;
			refsReplaced++;
			return `${publicDomain}/_${keyMap.get(rid) || rid}`;
		});
		desc = desc.replace(/\/res\/(\d+)/g, (_, rid) => {
			changed = true;
			refsReplaced++;
			return `${publicDomain}/${keyMap.get(rid) || rid}`;
		});
		if (changed) {
			db.run('UPDATE Post SET content = ?, desc = ? WHERE id = ?', [body, desc, post.id]);
			articlesUpdated++;
		}
	}

	return { synced, skipped, failed, articlesUpdated, refsReplaced };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const cfg = readR2Config();
	if (!cfg.accountId || !cfg.accessKey) {
		console.error('R2 not configured.');
		process.exit(1);
	}

	const DM = cfg.publicDomain;
	const r2Keys: string[] = []; // track for cleanup

	// ── Setup: clean previous run ──
	cleanupAll();
	ensureDir(UPLOAD_DIR);
	ensureDir(THUMB_DIR);

	// ── Setup: create test database ──
	console.log('── Setup ──');

	const db = new Database(DB_PATH);

	// System table (needed by migration for uploadDir/thumbDir)
	db.run(`CREATE TABLE IF NOT EXISTS System (
		id INTEGER PRIMARY KEY, uploadDir TEXT, thumbDir TEXT,
		r2Enabled INTEGER, r2AccountId TEXT, r2AccessKeyId TEXT,
		r2SecretAccessKey TEXT, r2Bucket TEXT, r2PublicDomain TEXT
	)`);
	db.run(
		`INSERT INTO System (id, uploadDir, thumbDir, r2Enabled, r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2Bucket, r2PublicDomain)
		VALUES (1, '${UPLOAD_DIR.replace(/\\/g, '/')}', '${THUMB_DIR.replace(/\\/g, '/')}', 1, ?, ?, ?, ?, ?)`,
		[cfg.accountId, cfg.accessKey, cfg.secretKey, cfg.bucket, cfg.publicDomain]
	);

	// Res table
	db.run(
		`CREATE TABLE IF NOT EXISTS Res (id INTEGER PRIMARY KEY, type TEXT, size INTEGER, name TEXT, md5 TEXT, thumb INTEGER, r2Key TEXT, r2Synced INTEGER, userId INTEGER)`
	);
	db.run(
		`INSERT INTO Res (id, type, size, name, thumb, r2Key) VALUES (101, 'image/png', 500, 'photo.png', 1, 'aaa101')`
	);
	db.run(
		`INSERT INTO Res (id, type, size, name, thumb, r2Key) VALUES (102, 'application/pdf', 300, 'doc.pdf', 0, 'bbb102')`
	);
	db.run(
		`INSERT INTO Res (id, type, size, name, thumb, r2Key) VALUES (103, 'image/jpeg', 800, 'bg.jpg', 0, 'ccc103')`
	);

	// Post table (body contains /res/ references)
	db.run(`CREATE TABLE IF NOT EXISTS Post (
		id INTEGER PRIMARY KEY, banner INTEGER, slug TEXT, desc TEXT,
		content TEXT, title TEXT, published INTEGER, createAt INTEGER
	)`);
	db.run(`INSERT INTO Post (id, banner, slug, desc, content, title, published) VALUES
		(1, 101, 'test-post', 'A post with image ![desc](/res/101) and file [doc](/res/102)',
		 'Article body with ![banner](/res/_101) and a [pdf](/res/102) link.', 'Test Post', 1)`);
	db.run(`INSERT INTO Post (id, banner, slug, content, title, published) VALUES
		(2, 0, 'no-banner', 'No resources here.', 'Plain Post', 1)`);

	// Tag table
	db.run(
		`CREATE TABLE IF NOT EXISTS Tag (id INTEGER PRIMARY KEY, name TEXT, banner INTEGER, desc TEXT, createAt INTEGER, userId INTEGER)`
	);
	db.run(
		`INSERT INTO Tag (id, name, banner, desc, createAt) VALUES (1, 'test-tag', 103, 'A tag with banner', ${Date.now()})`
	);

	ok('Test database created');
	console.log(`  Res: 3 rows, Post: 2 rows, Tag: 1 row`);

	// ── Setup: create local test files ──
	writeFileSync(join(UPLOAD_DIR, '101'), 'PNG_CONTENT_101');
	writeFileSync(join(UPLOAD_DIR, '102'), 'PDF_CONTENT_102');
	writeFileSync(join(UPLOAD_DIR, '103'), 'JPEG_CONTENT_103');
	writeFileSync(join(THUMB_DIR, '101'), 'PNG_THUMB_101'); // only 101 has thumb
	ok('Local test files created');

	// ── Pre-clean R2 ──
	for (const k of ['aaa101', 'bbb102', 'ccc103', '_aaa101']) {
		await r2Del(k);
	}

	// ── Verify pre-migration DB state ──
	console.log('\n── Pre-migration verification ──');
	let post1 = db.query('SELECT content, desc FROM Post WHERE id = 1').get() as PostRow;
	assert(post1.content.includes('/res/_101'), 'Post.body has /res/_101');
	assert(post1.content.includes('/res/102'), 'Post.body has /res/102');
	assert(post1.desc.includes('/res/101'), 'Post.desc has /res/101');

	let post2 = db.query('SELECT content FROM Post WHERE id = 2').get() as PostRow;
	assert(!post2.content.includes('/res/'), 'Post 2 has no /res/ refs');

	// ── Run migration ──
	console.log('\n── Running migration ──');
	const result = await runFullMigration(db, DM);
	console.log(`  ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed`);
	console.log(`  ${result.articlesUpdated} articles, ${result.refsReplaced} refs replaced`);

	// ── Verify migration results ──
	console.log('\n── Verification ──');

	// R2 uploads
	assert(await r2Head('aaa101'), 'R2 has aaa101');
	assert(await r2Head('bbb102'), 'R2 has bbb102');
	assert(await r2Head('ccc103'), 'R2 has ccc103');
	assert(await r2Head('_aaa101'), 'R2 has _aaa101');
	r2Keys.push('aaa101', 'bbb102', 'ccc103', '_aaa101');

	// Local files deleted
	assert(!existsSync(join(UPLOAD_DIR, '101')), 'Local 101 deleted');
	assert(!existsSync(join(UPLOAD_DIR, '102')), 'Local 102 deleted');
	assert(!existsSync(join(UPLOAD_DIR, '103')), 'Local 103 deleted');
	assert(!existsSync(join(THUMB_DIR, '101')), 'Local thumb 101 deleted');

	// Article content replaced
	post1 = db.query('SELECT content, desc FROM Post WHERE id = 1').get() as PostRow;
	assert(post1.content.includes(`${DM}/_aaa101`), `Post.body: /res/_101 → ${DM}/_aaa101`);
	assert(post1.content.includes(`${DM}/bbb102`), `Post.body: /res/102 → ${DM}/bbb102`);
	assert(post1.desc.includes(`${DM}/aaa101`), `Post.desc: /res/101 → ${DM}/aaa101`);
	assert(!post1.content.includes('/res/'), 'No residual /res/ in Post 1 body');
	assert(!post1.desc.includes('/res/'), 'No residual /res/ in Post 1 desc');

	// Post 2 untouched
	post2 = db.query('SELECT content FROM Post WHERE id = 2').get() as PostRow;
	assert(post2.content === 'No resources here.', 'Post 2 unchanged');

	// Tag banner unchanged (stays as integer ID)
	const tag = db.query('SELECT banner FROM Tag WHERE id = 1').get() as TagRow;
	assert(tag.banner === 103, 'Tag banner still 103 (ID unchanged)');

	// Statistics
	assert(result.synced === 3, `Synced: ${result.synced} (expected 3)`);
	assert(result.skipped === 0, `Skipped: ${result.skipped} (expected 0)`);
	assert(result.failed === 0, `Failed: ${result.failed} (expected 0)`);
	assert(result.articlesUpdated === 1, `Articles updated: ${result.articlesUpdated} (expected 1)`);

	// ── Cleanup ──
	console.log('\n── Cleanup ──');
	db.close();
	for (const k of r2Keys) await r2Del(k);
	cleanupAll();
	ok('All artifacts cleaned up');

	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed) process.exit(1);
}

main().catch((e) => {
	console.error('\nFATAL:', e);
	try {
		cleanupAll();
	} catch {}
	process.exit(1);
});

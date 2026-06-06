/**
 * R2 Migration Script
 *
 * Migrates local files to Cloudflare R2, then removes local copies.
 * Reads R2 credentials and paths from the System table.
 *
 * Usage:
 *   bun run scripts/migrate-to-r2.ts
 *
 * Environment variables (overrides DB values):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_DOMAIN
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Config — read from .dbCfg → System table
// ---------------------------------------------------------------------------

function readSystemConfig(): {
	uploadDir: string;
	thumbDir: string;
	r2AccountId: string;
	r2AccessKeyId: string;
	r2SecretAccessKey: string;
	r2Bucket: string;
	r2PublicDomain: string;
} | null {
	const dbCfg = resolve('.dbCfg');
	if (!existsSync(dbCfg)) {
		console.error('ERROR: .dbCfg not found. Run from project root.');
		return null;
	}
	const dbPath = readFileSync(dbCfg, 'utf-8').trim();
	const db = new Database(dbPath);
	const sys = db.query('SELECT * FROM System WHERE id = 1').get() as Record<string, unknown>;
	db.close();

	const r2AccountId = (process.env.R2_ACCOUNT_ID || (sys?.r2AccountId as string) || '').trim();
	const r2AccessKeyId = (process.env.R2_ACCESS_KEY || (sys?.r2AccessKeyId as string) || '').trim();
	const r2SecretAccessKey = (process.env.R2_SECRET_KEY || (sys?.r2SecretAccessKey as string) || '').trim();
	const r2Bucket = (process.env.R2_BUCKET || (sys?.r2Bucket as string) || '').trim();
	const r2PublicDomain = (process.env.R2_PUBLIC_DOMAIN || (sys?.r2PublicDomain as string) || '').trim();
	const uploadDir = (sys?.uploadDir as string) || 'upload';
	const thumbDir = (sys?.thumbDir as string) || 'thumb';

	if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
		console.error('ERROR: R2 not configured. Set r2AccountId/r2AccessKeyId/r2SecretAccessKey/r2Bucket.');
		console.error('HINT: Run the app and configure R2 in Admin → Settings → R2 Storage,');
		console.error('      or set R2_ACCOUNT_ID/R2_ACCESS_KEY/R2_SECRET_KEY/R2_BUCKET env vars.');
		return null;
	}

	return { uploadDir, thumbDir, r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2Bucket, r2PublicDomain };
}

// ---------------------------------------------------------------------------
// S3 Signature V4 (minimal, same as server cloudflare.ts)
// ---------------------------------------------------------------------------

async function r2Put(
	cfg: { accountId: string; accessKey: string; secretKey: string; bucket: string },
	key: string,
	buf: Uint8Array,
	contentType: string
): Promise<boolean> {
	try {
		const { signedHeaders } = await signRequest(
			cfg, 'PUT', key, buf, contentType
		);
		const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`;
		const url = `${endpoint}/${cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

		const res = await fetch(url, {
			method: 'PUT',
			headers: {
				...signedHeaders,
				'content-type': contentType || 'application/octet-stream'
			},
			body: buf,
			signal: AbortSignal.timeout(30000)
		});
		return res.ok;
	} catch (e) {
		console.error(`  [ERROR] r2Put ${key}:`, e);
		return false;
	}
}

async function r2Exists(
	cfg: { accountId: string; accessKey: string; secretKey: string; bucket: string },
	key: string
): Promise<boolean> {
	try {
		const { signedHeaders } = await signRequest(cfg, 'HEAD', key, new Uint8Array(0), '');
		const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`;
		const url = `${endpoint}/${cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

		const res = await fetch(url, {
			method: 'HEAD',
			headers: signedHeaders,
			signal: AbortSignal.timeout(10000)
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function sha256(data: string | Uint8Array): Promise<string> {
	const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	const hash = await crypto.subtle.digest('SHA-256', buf);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function hmac256(key: Uint8Array, data: string): Promise<Uint8Array> {
	const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
	return new Uint8Array(sig);
}

async function signRequest(
	cfg: { accountId: string; accessKey: string; secretKey: string; bucket: string },
	method: string,
	key: string,
	buf: Uint8Array,
	contentType: string
): Promise<{ signedHeaders: Record<string, string> }> {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);
	const region = 'auto';
	const service = 's3';

	const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
	const canonicalUri = `/${cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
	const payloadSha256 = method === 'PUT' ? await sha256(buf) : 'UNSIGNED-PAYLOAD';

	const signedNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
	const extra: Record<string, string> = {};
	if (contentType && method === 'PUT') {
		signedNames.push('content-type');
		extra['content-type'] = contentType;
	}
	signedNames.sort();

	const canonicalHeaders = signedNames
		.map((h) => {
			const v =
				h === 'host' ? host :
				h === 'x-amz-content-sha256' ? payloadSha256 :
				h === 'x-amz-date' ? amzDate :
				extra[h] || '';
			return `${h}:${v}`;
		})
		.join('\n');

	const signedHdr = signedNames.join(';');
	const canonicalReq = [method, canonicalUri, '', canonicalHeaders + '\n', signedHdr, payloadSha256].join('\n');
	const scope = `${dateStamp}/${region}/${service}/aws4_request`;
	const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonicalReq)].join('\n');

	const kDate = await hmac256(new TextEncoder().encode('AWS4' + cfg.secretKey), dateStamp);
	const kRegion = await hmac256(kDate, region);
	const kService = await hmac256(kRegion, service);
	const signingKey = await hmac256(kService, 'aws4_request');
	const signature = Array.from(new Uint8Array(await hmac256(signingKey, stringToSign)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return {
		signedHeaders: {
			Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHdr}, Signature=${signature}`,
			'x-amz-date': amzDate,
			'x-amz-content-sha256': payloadSha256
		}
	};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const sysCfg = readSystemConfig();
	if (!sysCfg) process.exit(1);

	const cfg = {
		accountId: sysCfg.r2AccountId,
		accessKey: sysCfg.r2AccessKeyId,
		secretKey: sysCfg.r2SecretAccessKey,
		bucket: sysCfg.r2Bucket
	};

	const isRepair = process.argv.includes('--repair');

	console.log(isRepair ? 'R2 Repair' : 'R2 Migration');
	console.log(`  Account: ${cfg.accountId}`);
	console.log(`  Bucket:  ${cfg.bucket}`);
	console.log(`  Upload dir: ${sysCfg.uploadDir}`);
	console.log(`  Thumb dir:  ${sysCfg.thumbDir}`);
	console.log('');

	// Read DB
	const dbCfg = readFileSync(resolve('.dbCfg'), 'utf-8').trim();
	const db = new Database(dbCfg);
	const rows = db.query('SELECT id, type, r2Key FROM Res').all() as { id: number; type: string; r2Key: string }[];
	console.log(`Found ${rows.length} resources to process.\n`);

	// Backfill r2Key from existing MD5 values
	const bk = db.run('UPDATE Res SET r2Key = substr(md5, 1, 6) WHERE r2Key IS NULL AND md5 IS NOT NULL');
	console.log(`Backfilled r2Key for ${(bk as any).changes} records`);

	// ── Repair mode: HEAD-check R2, fix r2Synced + r2Key ──
	if (isRepair) {
		console.log('\nRepair mode: HEAD-checking all Res records against R2...');
		const allRows = db.query('SELECT id, r2Key FROM Res').all() as { id: number; r2Key: string }[];
		console.log(`  ${allRows.length} total records`);
		let ok = 0, missing = 0, checked = 0;

		for (const row of allRows) {
			checked++;
			if (checked % 50 === 0) console.log(`  ...${checked}/${allRows.length}`);
			const numKey = String(row.id);
			const hashKey = row.r2Key;
			const numExists = await r2Exists(cfg, numKey);
			const hashExists = hashKey && hashKey !== numKey && await r2Exists(cfg, hashKey);
			const thumbKey = `_${numExists ? numKey : hashKey}_`;  // placeholder — we check below
			const thumbNumExists = numExists && await r2Exists(cfg, `_${numKey}`);
			const thumbHashExists = hashExists && await r2Exists(cfg, `_${hashKey}`);
			const synced = numExists || hashExists;
			const thumb = (numExists && thumbNumExists) || (hashExists && thumbHashExists) ? 1 : 0;

			if (synced) {
				db.run('UPDATE Res SET r2Synced = 1, thumb = ? WHERE id = ?', [thumb, row.id]);
				ok++;
			} else {
				// Try local disk
				const localPath = resolve(sysCfg.uploadDir, numKey);
				if (existsSync(localPath)) {
					const buf = new Uint8Array(readFileSync(localPath));
					if (await r2Put(cfg, numKey, buf, 'application/octet-stream')) {
						if (await r2Exists(cfg, numKey)) {
							try { unlinkSync(localPath); } catch {}
							db.run('UPDATE Res SET r2Synced = 1, r2Key = ? WHERE id = ?', [numKey, row.id]);
							ok++;
							continue;
						}
					}
				}
				db.run('UPDATE Res SET r2Synced = 0 WHERE id = ?', [row.id]);
				missing++;
			}
		}
		console.log(`  OK: ${ok}, Missing: ${missing}`);
		console.log('\nRepair complete.\n');
		db.close();
		return;
	}

	let synced = 0;
	let skipped = 0;
	let failed = 0;
	let processed = 0;
	const total = rows.length;

	for (const row of rows) {
		processed++;
		const id = String(row.id);
		const rk = row.r2Key || id;
		const localPath = resolve(sysCfg.uploadDir, id);

		// Check if already on R2
		if (await r2Exists(cfg, rk)) {
			skipped++;
			if (existsSync(localPath)) {
				try { unlinkSync(localPath); } catch {}
				console.log(`  [${processed}/${total}] skip ${id} (R2 exists, local deleted)`);
			}
			continue;
		}

		// Check local file
		if (!existsSync(localPath)) {
			skipped++;
			console.log(`  [${processed}/${total}] skip ${id} (local file missing)`);
			continue;
		}

		// Upload to R2
		console.log(`  [${processed}/${total}] uploading ${id} (${row.type || 'unknown'})...`);
		const buf = readFileSync(localPath);
		const ok = await r2Put(cfg, rk, new Uint8Array(buf), row.type || 'application/octet-stream');
		if (!ok) {
			failed++;
			console.log(`    [FAIL] upload failed`);
			continue;
		}

		// Verify and delete local
		if (await r2Exists(cfg, rk)) {
			try { unlinkSync(localPath); } catch {}
			db.run('UPDATE Res SET r2Synced = 1 WHERE id = ?', [row.id]);
			synced++;
			console.log(`    synced ✓`);
		} else {
			failed++;
			console.log(`    [FAIL] verify failed after upload`);
		}
	}

	// Handle thumbnails
	const thumbRows = db.query('SELECT id, r2Key FROM Res WHERE thumb = 1').all() as { id: number; r2Key: string }[];
	if (thumbRows.length) console.log(`\nProcessing ${thumbRows.length} thumbnails...`);
	let tp = 0;
	for (const row of thumbRows) {
		tp++;
		const tk = `_${row.r2Key || row.id}`;
		const localPath = resolve(sysCfg.thumbDir, String(row.id));

		if (await r2Exists(cfg, tk)) {
			if (existsSync(localPath)) {
				try { unlinkSync(localPath); } catch {}
			}
			continue;
		}

		if (!existsSync(localPath)) continue;

		console.log(`  [${tp}/${thumbRows.length}] uploading thumb ${row.id}...`);
		const buf = readFileSync(localPath);
		const ok = await r2Put(cfg, tk, new Uint8Array(buf), 'image/webp');
		if (!ok) {
			console.log(`    [FAIL] upload failed`);
			continue;
		}

		if (await r2Exists(cfg, tk)) {
			try { unlinkSync(localPath); } catch {}
			console.log(`    synced ✓`);
		} else {
			console.log(`    [FAIL] verify failed`);
		}
	}

	// ── Phase 3: Replace /res/ references in article content ──
	console.log('\nReplacing /res/ references in articles...');
	const publicDomain = sysCfg.r2PublicDomain;
	if (publicDomain) {
		let articlesUpdated = 0;
		let refsReplaced = 0;

		// Build id → r2Key map
		const keyMap = new Map<string, string>();
		for (const r of rows) keyMap.set(String(r.id), r.r2Key || String(r.id));

		// Update article body
		const posts = db.query('SELECT id, content, desc FROM Post').all() as { id: number; content: string; desc: string }[];
		for (const post of posts) {
			let changed = false;
			let body = post.content || '';
			let desc = post.desc || '';

			// Replace /res/{id} and /res/_{id} with R2 URLs
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
		console.log(`  Updated ${articlesUpdated} articles, ${refsReplaced} references replaced`);
	}

	db.close();

	console.log(`\nDone. Synced: ${synced}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);

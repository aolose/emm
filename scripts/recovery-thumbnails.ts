/**
 * Generate and upload thumbnails for specific resources (or all missing ones).
 * Downloads original from R2 public domain, resizes to 300px webp, uploads via S3 API.
 *
 * Usage:
 *   bun run scripts/recovery-thumbnails.ts           # all missing thumbnails
 *   bun run scripts/recovery-thumbnails.ts 442-445   # specific IDs
 */
import { Database } from 'bun:sqlite';

const db = new Database('blog.db');
const sys = db.query('SELECT * FROM System WHERE id = 1').get() as Record<string, any>;

const cfg = {
	accountId: sys.r2AccountId,
	accessKey: sys.r2AccessKeyId,
	secretKey: sys.r2SecretAccessKey,
	bucket: sys.r2Bucket,
	publicDomain: sys.r2PublicDomain
};

// ── S3 Signing (from migrate-to-r2.ts) ──────────────────────────────

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

async function signRequest(
	method: string,
	key: string,
	buf: Uint8Array,
	contentType: string
): Promise<Record<string, string>> {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);
	const region = 'auto';
	const service = 's3';
	const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
	const canonicalUri = `/${cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
	const payloadSha256 = await sha256(buf);

	const signedNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
	const extra: Record<string, string> = {};
	if (contentType) {
		signedNames.push('content-type');
		extra['content-type'] = contentType;
	}
	signedNames.sort();

	const canonicalHeaders = signedNames
		.map((h) => {
			const v =
				h === 'host'
					? host
					: h === 'x-amz-content-sha256'
						? payloadSha256
						: h === 'x-amz-date'
							? amzDate
							: extra[h] || '';
			return `${h}:${v}`;
		})
		.join('\n');

	const signedHdr = signedNames.join(';');
	const canonicalReq = [
		method,
		canonicalUri,
		'',
		canonicalHeaders + '\n',
		signedHdr,
		payloadSha256
	].join('\n');
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
		Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHdr}, Signature=${signature}`,
		'x-amz-date': amzDate,
		'x-amz-content-sha256': payloadSha256
	};
}

async function r2Put(key: string, buf: Uint8Array, contentType: string): Promise<boolean> {
	try {
		const signedHeaders = await signRequest('PUT', key, buf, contentType);
		const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`;
		const url = `${endpoint}/${cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
		const res = await fetch(url, {
			method: 'PUT',
			headers: { ...signedHeaders, 'content-type': contentType || 'application/octet-stream' },
			body: buf,
			signal: AbortSignal.timeout(30000)
		});
		return res.ok;
	} catch (e) {
		console.error(`  [ERROR] r2Put ${key}:`, (e as Error).message);
		return false;
	}
}

// ── Main ────────────────────────────────────────────────────────────

const targetIds = process.argv
	.slice(2)
	.flatMap((a) => a.split(',').map(Number))
	.filter(Boolean);
const whereClause = targetIds.length
	? `AND r.id IN (${targetIds.join(',')})`
	: `AND (r.thumb = 0 OR r.thumb IS NULL)`;

const toFix = db
	.query(
		`
	SELECT r.id, r.r2Key, r.name, r.type
	FROM Res r
	WHERE r.r2Synced = 1 AND r.type LIKE 'image/%' ${whereClause}
	ORDER BY r.id
`
	)
	.all() as { id: number; r2Key: string; name: string; type: string }[];

console.log(`Found ${toFix.length} resources to fix thumbnails:\n`);

let ok = 0,
	fail = 0;
for (const r of toFix) {
	const url = `${cfg.publicDomain}/${r.r2Key}`;
	const thumbKey = `_${r.r2Key}`;
	console.log(`  [${ok + fail + 1}/${toFix.length}] id=${r.id} r2Key="${r.r2Key}"`);

	try {
		// Download original from R2
		const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
		if (!resp.ok) {
			console.log(`    Download failed: ${resp.status}`);
			fail++;
			continue;
		}

		const buf = new Uint8Array(await resp.arrayBuffer());
		const img = new Bun.Image(buf);
		const { width } = await img.metadata();

		if (!width || width <= 300) {
			console.log(`    Image is ${width}px wide (≤300), no thumbnail needed`);
			db.run('UPDATE Res SET thumb = 1 WHERE id = ?', [r.id]);
			ok++;
			continue;
		}

		// Generate thumbnail
		const thumb = await img.resize(300).webp().bytes();
		console.log(`    Generated ${thumb.length} bytes thumbnail (${width}px → 300px)`);

		// Upload to R2
		const uploaded = await r2Put(thumbKey, thumb, 'image/webp');
		if (uploaded) {
			db.run('UPDATE Res SET thumb = 1 WHERE id = ?', [r.id]);
			console.log(`    Uploaded ${thumbKey} ✓`);
			ok++;
		} else {
			console.log(`    Upload failed ✗`);
			fail++;
		}
	} catch (e) {
		console.log(`    Error: ${(e as Error).message}`);
		fail++;
	}
}

console.log(`\nDone. OK: ${ok}, Failed: ${fail}`);
db.close();

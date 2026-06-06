/**
 * Set R2 credentials in local DB (one-shot config script).
 *
 * Usage: bun run scripts/set-r2-config.ts
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const dbCfg = resolve('.dbCfg');
if (!existsSync(dbCfg)) {
	console.error('.dbCfg not found — run from project root');
	process.exit(1);
}

const dbPath = readFileSync(dbCfg, 'utf-8').trim();
const db = new Database(dbPath);

db.run(`
	UPDATE System SET
		r2Enabled = 1,
		r2AccountId = '9b271dc189081759b43ad0e987ef5aeb',
		r2AccessKeyId = '63ebc9ce3f361343525ea8ccc0b0ccc2',
		r2SecretAccessKey = 'af3faa7f0eb99d937b8bb241b4c28cbfc4bca690eacf5b28a6d8e46033e673cf',
		r2Bucket = 'ooo',
		r2PublicDomain = 'https://r2.err.name'
	WHERE id = 1
`);

const row = db.query('SELECT r2Enabled, r2AccountId, r2Bucket, r2PublicDomain FROM System WHERE id = 1').get() as any;
console.log('R2 config written:');
console.log(`  Enabled:    ${row.r2Enabled}`);
console.log(`  Account ID: ${row.r2AccountId}`);
console.log(`  Bucket:     ${row.r2Bucket}`);
console.log(`  Public:     ${row.r2PublicDomain}`);

db.close();

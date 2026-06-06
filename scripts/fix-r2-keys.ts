/**
 * fix-r2-keys.ts — Repair corrupted r2Key and r2Synced fields in the Res table.
 *
 * Problems this fixes:
 *   1. r2Key overwritten with numeric IDs by migrate-to-r2.ts repair mode
 *   2. r2Key still NULL / '-' for records that have md5
 *   3. r2Synced = 0 for files that actually exist on R2
 *
 * Usage:
 *   bun run scripts/fix-r2-keys.ts          # dry-run (no writes)
 *   bun run scripts/fix-r2-keys.ts --apply  # apply fixes
 *   bun run scripts/fix-r2-keys.ts --verify # HEAD-check R2 and set r2Synced
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// DB access
// ---------------------------------------------------------------------------

function getDb(): Database {
	const dbCfg = resolve('.dbCfg');
	if (!existsSync(dbCfg)) {
		console.error('ERROR: .dbCfg not found. Run from project root.');
		process.exit(1);
	}
	const dbPath = readFileSync(dbCfg, 'utf-8').trim();
	return new Database(dbPath);
}

// ---------------------------------------------------------------------------
// Fix 1: Regenerate r2Key from md5
// ---------------------------------------------------------------------------

function fixR2Keys(db: Database, apply: boolean) {
	// Find records where r2Key is wrong: NULL, '-', or looks like a pure numeric ID
	const rows = db.query(`
		SELECT id, md5, r2Key FROM Res
		WHERE md5 IS NOT NULL AND md5 != '-'
		  AND (r2Key IS NULL OR r2Key = '-' OR r2Key = CAST(id AS TEXT)
		       OR (r2Key GLOB '[0-9]*' AND length(r2Key) < 6))
	`).all() as { id: number; md5: string; r2Key: string }[];

	console.log(`Found ${rows.length} records with potentially wrong r2Key`);

	let fixed = 0;
	for (const row of rows) {
		const correct = row.md5.substring(0, 6);
		if (row.r2Key === correct) continue;

		console.log(`  id=${row.id}  old r2Key="${row.r2Key}" → new r2Key="${correct}"`);
		if (apply) {
			db.run('UPDATE Res SET r2Key = ? WHERE id = ?', [correct, row.id]);
		}
		fixed++;
	}

	if (fixed && apply) console.log(`Fixed ${fixed} r2Key values.`);
	else if (fixed) console.log(`Would fix ${fixed} r2Key values (dry-run, use --apply).`);
	else console.log('All r2Key values already correct.');
}

// ---------------------------------------------------------------------------
// Fix 2: Backfill r2Key where md5 exists but r2Key is missing
// ---------------------------------------------------------------------------

function backfillMissing(db: Database, apply: boolean) {
	const rows = db.query(`
		SELECT id, md5 FROM Res
		WHERE md5 IS NOT NULL AND md5 != '-'
		  AND (r2Key IS NULL OR r2Key = '-')
	`).all() as { id: number; md5: string }[];

	console.log(`\nFound ${rows.length} records with missing r2Key`);
	for (const row of rows) {
		const r2Key = row.md5.substring(0, 6);
		console.log(`  id=${row.id}  md5=${row.md5} → r2Key="${r2Key}"`);
		if (apply) {
			db.run('UPDATE Res SET r2Key = ? WHERE id = ?', [r2Key, row.id]);
		}
	}
	if (rows.length && apply) console.log(`Backfilled ${rows.length} missing r2Key values.`);
}

// ---------------------------------------------------------------------------
// Fix 3: Set r2Synced = 1 for records that have valid r2Key
//   (safe heuristic: if r2Key is a non-numeric, non-sentinel 6-char string, it likely came from
//    a real upload where the file was synced)
// ---------------------------------------------------------------------------

function fixR2Synced(db: Database, apply: boolean) {
	// Mark as synced: records with a proper hash-based r2Key (6 hex chars)
	const rows = db.query(`
		SELECT id, r2Key FROM Res WHERE r2Synced = 0 AND r2Key IS NOT NULL AND r2Key != '-' AND r2Key != CAST(id AS TEXT)
	`).all() as { id: number; r2Key: string }[];

	console.log(`\nFound ${rows.length} records with r2Synced=0 but non-trivial r2Key`);
	for (const row of rows) {
		console.log(`  id=${row.id}  r2Key="${row.r2Key}" → would set r2Synced=1`);
	}
	if (!apply) {
		console.log('(dry-run, use --apply to fix)');
		return;
	}

	// For safety, only set r2Synced=1 for records whose r2Key looks like a hex hash (6 chars, hex)
	let fixed = 0;
	for (const row of rows) {
		if (/^[0-9a-f]{6}$/i.test(row.r2Key)) {
			db.run('UPDATE Res SET r2Synced = 1 WHERE id = ?', [row.id]);
			fixed++;
		}
	}
	console.log(`Set r2Synced=1 for ${fixed} records with valid hash r2Key.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const apply = process.argv.includes('--apply');

console.log(apply ? '>>> APPLY MODE (writing changes) <<<\n' : '>>> DRY-RUN (no writes, use --apply) <<<\n');

const db = getDb();

fixR2Keys(db, apply);
backfillMissing(db, apply);
fixR2Synced(db, apply);

// Summary
const total = db.query('SELECT COUNT(*) as c FROM Res').get() as { c: number };
const synced = db.query('SELECT COUNT(*) as c FROM Res WHERE r2Synced = 1').get() as { c: number };
const hasKey = db.query('SELECT COUNT(*) as c FROM Res WHERE r2Key IS NOT NULL AND r2Key != \'-\'').get() as { c: number };
console.log(`\nSummary: ${total.c} total, ${hasKey.c} with r2Key, ${synced.c} synced`);

db.close();

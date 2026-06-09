/**
 * Clear ALL blacklist entries — local SQLite BlackList table + Cloudflare IP list.
 *
 * Usage:
 *   bun run scripts/clear-all-blacklist.ts            # clear both local + CF
 *   bun run scripts/clear-all-blacklist.ts --local-only # skip CF
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const ARGS = new Set(process.argv.slice(2));
const LOCAL_ONLY = ARGS.has('--local-only');

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

const DB_CFG = resolve('.dbCfg');

function getDbPath(): string {
	return readFileSync(DB_CFG, 'utf-8').trim();
}

interface SysRow {
	cfAccountId: string | null;
	cfApiToken: string | null;
	cfListId: string | null;
}

// ---------------------------------------------------------------------------
// Cloudflare API
// ---------------------------------------------------------------------------

const CF_BASE = 'https://api.cloudflare.com/client/v4';

function cfHeaders(token: string): Headers {
	return new Headers({
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json'
	});
}

/** Fetch CF list item count via list metadata (num_items field). Returns -1 on error. */
async function getCfCount(
	accountId: string,
	token: string,
	listId: string
): Promise<number> {
	try {
		const res = await fetch(
			`${CF_BASE}/accounts/${accountId}/rules/lists/${listId}`,
			{ headers: cfHeaders(token), signal: AbortSignal.timeout(10_000) }
		);
		const data = (await res.json()) as {
			success: boolean;
			errors?: { code: number; message: string }[];
			result?: { num_items?: number };
		};
		if (!data.success) {
			const msgs = (data.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ');
			console.error(`  CF API error: HTTP ${res.status} — ${msgs || JSON.stringify(data).slice(0, 200)}`);
			return -1;
		}
		return data.result?.num_items ?? -1;
	} catch (e) {
		console.error('  CF fetch error:', (e as Error).message);
		return -1;
	}
}

/** Clear ALL items from a CF IP list by replacing with empty array (PUT []). */
async function clearCfList(
	accountId: string,
	token: string,
	listId: string
): Promise<{ ok: boolean; removed: number }> {
	try {
		const res = await fetch(
			`${CF_BASE}/accounts/${accountId}/rules/lists/${listId}/items`,
			{
				method: 'PUT',
				headers: cfHeaders(token),
				body: '[]',
				signal: AbortSignal.timeout(30_000)
			}
		);
		const data = (await res.json()) as {
			success: boolean;
			errors?: { code: number; message: string }[];
		};
		if (!data.success) {
			const msgs = (data.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ');
			console.error(`  CF clear error: HTTP ${res.status} — ${msgs || JSON.stringify(data).slice(0, 300)}`);
			return { ok: false, removed: 0 };
		}
		// PUT replaces all items — the operation_id is async, but for empty body it's instant
		return { ok: true, removed: -1 }; // -1 = unknown exact count, cleared successfully
	} catch (e) {
		console.error('  CF clear fetch error:', (e as Error).message);
		return { ok: false, removed: 0 };
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const dbPath = getDbPath();
	console.log('DB:', dbPath);

	const { Database } = await import('bun:sqlite');
	const db = new Database(dbPath);

	// ---- Local blacklist ----
	const localCount = (
		db.query('SELECT COUNT(*) AS cnt FROM BlackList').get() as { cnt: number }
	).cnt;
	console.log(`\nLocal BlackList entries: ${localCount}`);

	// ---- CF config ----
	const sys = db
		.query('SELECT cfAccountId, cfApiToken, cfListId FROM System WHERE id = 1')
		.get() as SysRow | undefined;
	const cfConfigured = !!(sys?.cfAccountId && sys?.cfApiToken && sys?.cfListId);

	let cfCount = 0;
	let cfOk = false;

	if (LOCAL_ONLY) {
		console.log('CF: skipped (--local-only).');
	} else if (cfConfigured) {
		console.log(`CF listId: ${sys!.cfListId}`);
		cfCount = await getCfCount(sys!.cfAccountId!, sys!.cfApiToken!, sys!.cfListId!);
		if (cfCount >= 0) {
			console.log(`CF list items: ${cfCount}`);
			cfOk = true;
		} else {
			console.log('CF list items: unknown (see error above)');
			console.log('  Will still attempt to clear CF list.');
			cfOk = true; // still try
		}
	} else {
		console.log('CF: not configured, skipping.');
	}

	// ---- Summary ----
	if (localCount === 0 && (!cfOk || cfCount === 0)) {
		console.log('\nNothing to clear.');
		db.close();
		return;
	}

	console.log('\n---');
	const parts: string[] = [];
	if (localCount > 0) parts.push(`${localCount} local entries`);
	if (cfOk) parts.push(cfCount >= 0 ? `${cfCount} CF items` : 'CF items (count unknown)');
	console.log(`Will clear: ${parts.join(' + ')}`);
	if (LOCAL_ONLY) console.log('(CF skipped per --local-only)');
	console.log('Press Enter to confirm, Ctrl+C to cancel...');

	// Wait for Enter
	try {
		await new Promise<void>((resolve) => {
			const onData = () => {
				process.stdin.off('data', onData);
				resolve();
			};
			process.stdin.on('data', onData);
		});
	} catch {
		// stdin not available, proceed
	}

	console.log('\nClearing...\n');

	// ---- Clear CF first ----
	if (cfOk) {
		const { cfAccountId, cfApiToken, cfListId } = sys!;
		const result = await clearCfList(cfAccountId!, cfApiToken!, cfListId!);
		if (result.ok) {
			console.log(`CF: cleared OK.`);
		} else {
			console.log('CF: clear FAILED (see error above).');
		}
	}

	// ---- Clear local DB ----
	db.run('DELETE FROM BlackList');
	const remaining = (db.query('SELECT COUNT(*) AS cnt FROM BlackList').get() as { cnt: number }).cnt;
	console.log(`Local DB: cleared. Remaining: ${remaining}`);

	db.close();
	console.log('\nDone. Restart the server to reload in-memory firewall state.');
}

main().catch((e) => {
	console.error('Fatal:', e);
	process.exit(1);
});

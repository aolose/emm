/**
 * Remove BlackList entries from the last 24 hours, and synchronize removals
 * with Cloudflare IP list when configured.
 *
 * Usage: bun run scripts/remove-recent-blacklist.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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

interface BlRow {
	id: number;
	ip: string;
	mark: string | null;
	createAt: number;
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

interface CfItem {
	id: string;
	ip: string;
	comment?: string;
}

/** Fetch all items from the configured CF IP list (paginated). */
async function fetchCfItems(
	accountId: string,
	token: string,
	listId: string
): Promise<CfItem[]> {
	const items: CfItem[] = [];
	let cursor: string | null = null;

	do {
		let url = `${CF_BASE}/accounts/${accountId}/rules/lists/${listId}/items?per_page=100`;
		if (cursor) url += `&cursor=${cursor}`;

		const res = await fetch(url, {
			headers: cfHeaders(token),
			signal: AbortSignal.timeout(10_000)
		});
		const data = (await res.json()) as {
			success: boolean;
			result: CfItem[];
			result_info?: { cursors?: { after?: string } };
		};
		if (!data.success) {
			console.error('[cf] getListItems failed:', JSON.stringify(data).slice(0, 200));
			break;
		}
		items.push(...(data.result || []));
		cursor = data.result_info?.cursors?.after || null;
	} while (cursor);

	return items;
}

/** Remove items from the CF list by their item IDs. */
async function removeCfItems(
	accountId: string,
	token: string,
	listId: string,
	itemIds: string[]
): Promise<boolean> {
	if (!itemIds.length) return true;

	const res = await fetch(`${CF_BASE}/accounts/${accountId}/rules/lists/${listId}/items`, {
		method: 'DELETE',
		headers: cfHeaders(token),
		body: JSON.stringify({ items: itemIds.map((id) => ({ id })) }),
		signal: AbortSignal.timeout(10_000)
	});
	const data = (await res.json()) as { success: boolean };
	if (!data.success) {
		console.error('[cf] removeIpsFromList failed:', JSON.stringify(data).slice(0, 200));
		return false;
	}
	return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const dbPath = getDbPath();
	console.log('DB:', dbPath);

	const { Database } = await import('bun:sqlite');
	const db = new Database(dbPath);

	// Read system config
	const sys = db.query('SELECT cfAccountId, cfApiToken, cfListId FROM System WHERE id = 1').get() as SysRow | undefined;
	const cfConfigured = !!(sys?.cfAccountId && sys?.cfApiToken && sys?.cfListId);

	// Read BlackList entries from last 24 hours
	const cutoff = Date.now() - 24 * 3600 * 1000;
	const recent = db
		.query('SELECT id, ip, mark, createAt FROM BlackList WHERE createAt >= ?')
		.all(cutoff) as BlRow[];

	if (!recent.length) {
		console.log('No blacklist entries in the last 24 hours.');
		db.close();
		return;
	}

	// Show summary
	console.log(`\nFound ${recent.length} blacklist entries from the last 24 hours:`);
	const marks = new Map<string, number>();
	for (const r of recent) {
		const m = r.mark || '-';
		marks.set(m, (marks.get(m) || 0) + 1);
	}
	for (const [mark, count] of marks) {
		console.log(`  mark="${mark}": ${count}`);
	}
	console.log(`\nIPs: ${recent.map((r) => r.ip).join(', ')}`);

	if (cfConfigured) {
		console.log(`\nCF configured: listId=${sys!.cfListId}`);
	}

	// Confirmation — use a simple prompt
	console.log('\nPress Enter to remove these entries (local DB + CF), Ctrl+C to cancel...');

	// Wait for Enter
	await new Promise<void>((resolve) => {
		const buf = new Uint8Array(1);
		// Note: Bun's stdin is async; we use a simple read
		process.stdin.once('data', () => resolve());
	});
	// Also handle if no stdin
	console.log('Proceeding with removal...\n');

	// --- Remove from CF first ---
	if (cfConfigured) {
		const { cfAccountId, cfApiToken, cfListId } = sys!;
		const targetIps = new Set(recent.map((r) => r.ip));

		console.log(`Fetching CF list items for list ${cfListId}...`);
		const cfItems = await fetchCfItems(cfAccountId!, cfApiToken!, cfListId!);
		console.log(`  CF list has ${cfItems.length} total items.`);

		const cfIdsToRemove: string[] = [];
		for (const item of cfItems) {
			if (targetIps.has(item.ip)) {
				cfIdsToRemove.push(item.id);
			}
		}

		if (cfIdsToRemove.length) {
			console.log(`  Removing ${cfIdsToRemove.length} IPs from CF...`);
			const ok = await removeCfItems(cfAccountId!, cfApiToken!, cfListId!, cfIdsToRemove);
			console.log(ok ? '  CF removal OK.' : '  CF removal FAILED.');
		} else {
			console.log('  No matching IPs found in CF list (may have already been removed).');
		}
	}

	// --- Remove from local DB ---
	const ids = recent.map((r) => r.id);
	const placeholders = ids.map(() => '?').join(',');
	db.run(`DELETE FROM BlackList WHERE id IN (${placeholders})`, ...ids);
	console.log(`Removed ${ids.length} entries from local BlackList.`);

	const remaining = db.query('SELECT COUNT(*) AS cnt FROM BlackList').get() as { cnt: number };
	console.log(`Remaining blacklist entries: ${remaining.cnt}`);

	db.close();
	console.log('Done.');
}

main().catch((e) => {
	console.error('Fatal:', e);
	process.exit(1);
});

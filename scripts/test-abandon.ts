/**
 * Turnstile Abandon Simulation Test
 *
 * Usage (two steps):
 *   STEP 1 — Stop dev server, then:
 *     bun run scripts/test-abandon.ts
 *   → configures Turnstile in DB, tells you to restart server
 *
 *   STEP 2 — Start dev server, then:
 *     bun run scripts/test-abandon.ts
 *   → runs the actual simulation test
 */

import { Database } from 'bun:sqlite';

const DB_PATH = 'blog.db';
const BASE_URL = 'http://localhost:5173';
// Fake external IP to avoid localhost bypass
const FAKE_IP = '10.99.88.77';

// ---------------------------------------------------------------------------
function getDb(): Database {
	return new Database(DB_PATH);
}

// ---------------------------------------------------------------------------
// Phase 1: Setup Turnstile config in DB
// ---------------------------------------------------------------------------
function setup(): void {
	const db = getDb();
	const sys = db
		.query('SELECT tsEnabled, tsSiteKey, tsSecret FROM System WHERE id = 1')
		.get() as { tsEnabled: number | null; tsSiteKey: string | null; tsSecret: string | null } | undefined;

	if (!sys) {
		console.error('System row not found!');
		process.exit(1);
	}

	const enabled = sys.tsEnabled === 1;
	const hasKey = !!(sys.tsSiteKey && sys.tsSiteKey !== '-');
	const hasSecret = !!(sys.tsSecret && sys.tsSecret !== '-');

	if (enabled && hasKey && hasSecret) {
		console.log('Turnstile already configured.');
		console.log(`  tsEnabled=1  siteKey=${sys.tsSiteKey}  secret=${sys.tsSecret?.substring(0, 6)}...`);
		db.close();
		return;
	}

	console.log('Configuring Turnstile for test...');
	if (!enabled) console.log('  Setting tsEnabled = 1');
	if (!hasKey) console.log('  Setting tsSiteKey = test-site-key');
	if (!hasSecret) console.log('  Setting tsSecret = test-secret');

	db.run(
		`UPDATE System
     SET tsEnabled  = 1,
         tsSiteKey  = CASE WHEN tsSiteKey IS NULL OR tsSiteKey = '-' THEN 'test-site-key' ELSE tsSiteKey END,
         tsSecret   = CASE WHEN tsSecret IS NULL OR tsSecret = '-' THEN 'test-secret' ELSE tsSecret END
     WHERE id = 1`
	);
	db.close();

	console.log('\n=== DONE ===');
	console.log('Now START the dev server (`bun run dev`) and run this script again.');
	console.log('');
}

// ---------------------------------------------------------------------------
// Phase 2: Run the simulation
// ---------------------------------------------------------------------------
async function fetchWithRedirect(opts: {
	path: string;
	ip: string;
	ua: string;
	followRedirect: boolean;
}): Promise<{ status: number; location?: string }> {
	const headers = new Headers({
		'x-forwarded-for': opts.ip,
		'user-agent': opts.ua
	});
	const redirect = opts.followRedirect ? 'follow' : 'manual';
	const resp = await fetch(`${BASE_URL}${opts.path}`, { headers, redirect });
	return { status: resp.status, location: resp.headers.get('location') || undefined };
}

async function run() {
	console.log('=== Turnstile Abandon Simulation ===\n');

	// Verify Turnstile is configured
	const dbPre = getDb();
	const cfg = dbPre
		.query('SELECT tsEnabled, tsSiteKey, tsSecret FROM System WHERE id = 1')
		.get() as { tsEnabled: number; tsSiteKey: string; tsSecret: string } | undefined;
	dbPre.close();

	if (!cfg || cfg.tsEnabled !== 1 || !cfg.tsSiteKey || cfg.tsSiteKey === '-' || !cfg.tsSecret || cfg.tsSecret === '-') {
		console.error('Turnstile NOT configured. Run this script first WITHOUT the dev server running.');
		process.exit(1);
	}
	console.log('Turnstile config: OK');

	// Clean previous test data
	console.log(`\nCleaning previous blacklist for ${FAKE_IP}...`);
	const dbClean = getDb();
	const before = dbClean.query('SELECT COUNT(*) as c FROM BlackList WHERE ip = ?').get(FAKE_IP) as { c: number };
	if (before.c > 0) {
		dbClean.run('DELETE FROM BlackList WHERE ip = ?', [FAKE_IP]);
		console.log(`  Removed ${before.c} entries.`);
	}
	dbClean.close();

	// Step 1: Hit /posts with redirect=manual
	const ua =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
	console.log(`\nStep 1: GET /posts from ${FAKE_IP} (redirect=manual)...`);
	const r1 = await fetchWithRedirect({ path: '/posts', ip: FAKE_IP, ua, followRedirect: false });
	console.log(`  → ${r1.status}${r1.location ? '  Location: ' + r1.location : ''}`);

	if (r1.status !== 307) {
		console.warn('  Expected 307, got', r1.status);
		console.warn('  Is the dev server running? Is Turnstile actually enabled?');
	}

	// Step 2: Wait for abandon timeout (5s for id=28, wait 6s)
	console.log('\nStep 2: Waiting 6s for abandon timeout...');
	await new Promise((r) => setTimeout(r, 6000));

	// Step 3: Check BlackList
	console.log('\nStep 3: Checking BlackList in DB...');
	const dbCheck = getDb();
	const bl = dbCheck.query('SELECT id, ip, mark, respId, createAt FROM BlackList WHERE ip = ?').get(FAKE_IP) as {
		id: number;
		ip: string;
		mark: string;
		respId: number;
		createAt: number;
	} | undefined;
	dbCheck.close();

	if (bl) {
		console.log(`  ✓ FOUND  id=${bl.id}  mark="${bl.mark}"  respId=${bl.respId}`);
	} else {
		console.error('  ✗ NOT FOUND — abandon rule did NOT fire.');
		console.error('  Check: dev server running? Turnstile enabled? Trigger id=28 active?');
		process.exit(1);
	}

	// Step 4: Try /admin with blacklisted IP
	console.log('\nStep 4: GET /admin from blacklisted IP...');
	const r2 = await fetchWithRedirect({ path: '/admin', ip: FAKE_IP, ua, followRedirect: false });
	console.log(`  → ${r2.status}${r2.location ? '  Location: ' + r2.location : ''}`);

	if (r2.status === 403) {
		console.log('\n✓ PASS: Blacklisted IP correctly blocked with 403');
	} else if (r2.status === 200) {
		console.log('\n✗ FAIL: /admin returned 200 — blacklist is NOT blocking!');
	} else if (r2.status === 307 && r2.location?.startsWith('/login')) {
		console.log('\n✗ FAIL: Redirected to /login — checkRedirect ran, blacklist did NOT block.');
	} else {
		console.log(`\n? UNEXPECTED: status=${r2.status}`);
	}

	// Step 5: Also check what checkRedirect would do
	console.log('\nStep 5: GET /admin with followRedirect (checkRedirect test)...');
	const r3 = await fetchWithRedirect({ path: '/admin', ip: FAKE_IP, ua, followRedirect: true });
	console.log(`  → ${r3.status}`);

	// Cleanup
	console.log(`\nCleaning up test entry for ${FAKE_IP}...`);
	const dbEnd = getDb();
	dbEnd.run('DELETE FROM BlackList WHERE ip = ?', [FAKE_IP]);
	dbEnd.close();
	console.log('  Done.');
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

(async () => {
	if (args.includes('--setup')) {
		setup();
	} else {
		await run();
	}
})().catch((e) => {
	console.error('Fatal:', e);
	process.exit(1);
});

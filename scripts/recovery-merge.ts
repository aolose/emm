/**
 * recovery-merge.ts — Merge online.db into blog.db using ATTACH DATABASE.
 * All data transfers happen in SQL, avoiding JS type coercion issues.
 *
 * Usage:
 *   bun run scripts/recovery-merge.ts            # dry-run
 *   bun run scripts/recovery-merge.ts --apply    # apply changes
 */
import { Database } from 'bun:sqlite';

const BLOG = 'blog.db';
const ONLINE = 'online.db';
const apply = process.argv.includes('--apply');

const log = (...args: any[]) => console.log(...args);
log(apply ? '>>> APPLY MODE <<<\n' : '>>> DRY-RUN (use --apply) <<<\n');

// Open main DB and attach online
const db = new Database(BLOG);
db.run('PRAGMA journal_mode=WAL');
db.run(`ATTACH DATABASE '${ONLINE}' AS online`);

const run = (sql: string, label?: string) => {
	if (label) log(`  ${label}`);
	if (apply) db.run(sql);
};

const query = (sql: string) => db.query(sql).all() as any[];
const get = (sql: string) => db.query(sql).get() as any;

function tableCols(table: string): string[] {
	try { return query(`PRAGMA table_info("${table}")`).map((r: any) => r.name); }
	catch { return []; }
}

// ── Step 0: Schema migration – add missing columns ──────────────────
log('--- Step 0: Schema migration ---');

// Res table
if (!tableCols('Res').includes('r2Key')) {
	run("ALTER TABLE Res ADD COLUMN r2Synced INTEGER DEFAULT 0", 'Res: adding r2Synced');
	run("ALTER TABLE Res ADD COLUMN r2Key TEXT DEFAULT '-'",     'Res: adding r2Key');
}

// Add missing columns to ALL tables that exist in both
const tables = ['System','Post','Tag','Comment','CmUser','PostTag','Require','RequireMap',
	'FWRule','FwResp','FwLog','BlackList','WhiteList','RPU','RPUCache','PostRead',
	'TokenInfo','User','ShortPost'];

for (const t of tables) {
	const blogCols = new Set(tableCols(t));
	const onlineCols: string[] = [];
	try { onlineCols.push(...query(`PRAGMA online.table_info("${t}")`).map((r: any) => r.name)); } catch { continue; }
	const missing = onlineCols.filter(c => !blogCols.has(c));
	if (missing.length) {
		log(`  ${t}: adding ${missing.join(', ')}`);
		if (apply) for (const c of missing) db.run(`ALTER TABLE "${t}" ADD COLUMN "${c}" TEXT DEFAULT ''`);
	}
}

// ── Step 1: Fix r2Key from md5 ──────────────────────────────────────
log('\n--- Step 1: Fix r2Key ---');
const badR2 = query(`SELECT id, md5, r2Key FROM Res WHERE md5 IS NOT NULL AND md5 != '-' AND r2Key != substr(md5,1,6)`);
log(`  ${badR2.length} records need fix`);
if (badR2.length <= 20) {
	for (const r of badR2) log(`    id=${r.id} "${r.r2Key}" → "${r.md5.substring(0,6)}"`);
}
run("UPDATE Res SET r2Key = substr(md5,1,6) WHERE md5 IS NOT NULL AND md5 != '-' AND r2Key != substr(md5,1,6)", 'Fixing...');

// ── Step 2: Sync System config from online ──────────────────────────
log('\n--- Step 2: Sync System config ---');
const sysCols = tableCols('System');
const syncCols = [
	'r2Enabled','r2AccountId','r2AccessKeyId','r2SecretAccessKey','r2Bucket','r2PublicDomain',
	'cfAccountId','cfApiToken','cfListId',
	'aiApiKey','aiModel',
	'tsEnabled','tsSiteKey','tsSecret','tsVerifyTTL',
	'comment','cmCheck','fwAggregate','fwLastCount','fwLastAggregateAt',
	'analysis','noSpam','maxFireLogs'
].filter(c => sysCols.includes(c));

// Build: UPDATE System SET c1=(SELECT c1 FROM online.System), c2=...
const sets = syncCols.map(c => `"${c}" = (SELECT "${c}" FROM online.System WHERE id=1)`).join(',\n    ');
const sysSQL = `UPDATE System SET ${sets} WHERE id=1`;
const before = get('SELECT r2Enabled, tsEnabled, cfAccountId FROM System WHERE id=1');
run(sysSQL, `Syncing ${syncCols.length} fields`);
if (apply) {
	const after = get('SELECT r2Enabled, tsEnabled, cfAccountId FROM System WHERE id=1');
	log(`  r2Enabled: ${before?.r2Enabled} → ${after?.r2Enabled}`);
	log(`  tsEnabled: ${before?.tsEnabled} → ${after?.tsEnabled}`);
}

// ── Step 3: Merge content tables (INSERT missing IDs) ───────────────
log('\n--- Step 3: Merge content tables ---');

const mergeTables: Record<string, string> = {
	Post:      'INSERT INTO main.Post      SELECT * FROM online.Post      WHERE id NOT IN (SELECT id FROM main.Post)',
	Res:       'INSERT INTO main.Res       SELECT * FROM online.Res       WHERE id NOT IN (SELECT id FROM main.Res)',
	Tag:       'INSERT INTO main.Tag       SELECT * FROM online.Tag       WHERE id NOT IN (SELECT id FROM main.Tag)',
	PostTag:   'INSERT INTO main.PostTag   SELECT * FROM online.PostTag   WHERE (postId||":"||tagId) NOT IN (SELECT postId||":"||tagId FROM main.PostTag)',
	Comment:   'INSERT INTO main.Comment   SELECT * FROM online.Comment   WHERE id NOT IN (SELECT id FROM main.Comment)',
	CmUser:    'INSERT INTO main.CmUser    SELECT * FROM online.CmUser    WHERE id NOT IN (SELECT id FROM main.CmUser)',
	Require:   'INSERT INTO main.Require   SELECT * FROM online.Require   WHERE id NOT IN (SELECT id FROM main.Require)',
	RequireMap:'INSERT INTO main.RequireMap SELECT * FROM online.RequireMap WHERE id NOT IN (SELECT id FROM main.RequireMap)',
};

for (const [table, sql] of Object.entries(mergeTables)) {
	const before = get(`SELECT COUNT(*) as c FROM main."${table}"`)?.c ?? 0;
	try {
		run(sql);
		const after = get(`SELECT COUNT(*) as c FROM main."${table}"`)?.c ?? 0;
		const diff = after - before;
		log(`  ${table}: ${before} → ${after} (${diff > 0 ? '+' + diff : 'unchanged'})`);
	} catch (e: any) {
		log(`  ${table}: SKIP (${e.message.split('\n')[0]})`);
	}
}

// After merging Res from online, regenerate r2Key for the new ones
run("UPDATE Res SET r2Key = substr(md5,1,6), r2Synced = 0 WHERE r2Synced IS NULL OR r2Synced = ''");

// ── Step 4: Full-replace operational tables ──────────────────────────
log('\n--- Step 4: Full-replace operational tables ---');
const replaceTables = [
	'FWRule','FwResp','FwLog','BlackList','WhiteList',
	'RPU','RPUCache','PostRead',
	'TokenInfo','User'
];

for (const t of replaceTables) {
	try {
		const oc = get(`SELECT COUNT(*) as c FROM online."${t}"`)?.c ?? 0;
		run(`DELETE FROM main."${t}"`);
		run(`INSERT INTO main."${t}" SELECT * FROM online."${t}"`);
		const bc = get(`SELECT COUNT(*) as c FROM main."${t}"`)?.c ?? 0;
		log(`  ${t}: ${bc} rows (online had ${oc})`);
	} catch (e: any) {
		log(`  ${t}: SKIP (${e.message.split('\n')[0]})`);
	}
}

// ── Step 5: Final summary ───────────────────────────────────────────
log('\n=== Summary ===');
for (const t of ['Post','Res','Tag','Comment','FWRule','FwResp','FwLog','BlackList']) {
	try {
		const c = get(`SELECT COUNT(*) as c FROM main."${t}"`)?.c ?? '?';
		log(`  ${t}: ${c}`);
	} catch {}
}

db.run('DETACH DATABASE online');
db.close();
log('\nDone.');

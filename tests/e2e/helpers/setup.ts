/**
 * Turnstile E2E Test Setup
 * Usage: bun run tests/e2e/helpers/setup.ts
 */
import { Database } from 'bun:sqlite';
import { resolve } from 'path';
import { writeFileSync, existsSync, unlinkSync } from 'fs';

const ROOT = resolve(import.meta.dir, '../../..');
// Use timestamped DB to avoid lock conflicts
const DB_PATH = resolve(ROOT, `tests/e2e/e2e-${Date.now()}.db`);
const DB_CFG = resolve(ROOT, '.dbCfg');

const KEYS = {
  alwaysPass:       { site: '1x00000000000000000000AA', secret: '1x0000000000000000000000000000000AA' },
  alwaysFail:       { site: '2x00000000000000000000AB', secret: '2x0000000000000000000000000000000AA' },
  invisiblePass:    { site: '1x00000000000000000000BB', secret: '1x0000000000000000000000000000000BB' },
  invisibleFail:    { site: '2x00000000000000000000BB', secret: '2x0000000000000000000000000000000BB' },
  forceInteractive: { site: '3x00000000000000000000FF', secret: '3x0000000000000000000000000000000FF' },
};

try { if (existsSync(DB_CFG)) unlinkSync(DB_CFG); } catch {}

const db = new Database(DB_PATH);

db.run(`CREATE TABLE IF NOT EXISTS System (
  id INTEGER PRIMARY KEY,
  admUsr TEXT DEFAULT '-', about TEXT DEFAULT '-', admPwd TEXT DEFAULT '-',
  uploadDir TEXT DEFAULT '-', thumbDir TEXT DEFAULT '-', blogName TEXT DEFAULT '-',
  blogBio TEXT DEFAULT '-', seoKey TEXT DEFAULT '-', linkedin TEXT DEFAULT '-',
  github TEXT DEFAULT '-', seoDesc TEXT DEFAULT '-', ipLiteToken TEXT DEFAULT '-',
  ipLiteDir TEXT DEFAULT '-', description TEXT DEFAULT '-', keywords TEXT DEFAULT '-',
  comment INTEGER DEFAULT -1, noSpam INTEGER DEFAULT 0, cmCheck INTEGER DEFAULT -1,
  analysis INTEGER DEFAULT 0, pageScript TEXT DEFAULT '-', pageCss TEXT DEFAULT '-',
  robots TEXT DEFAULT '-', maxFireLogs INTEGER DEFAULT 1000, pwdSalt TEXT DEFAULT '-',
  tsEnabled INTEGER DEFAULT 0, tsSiteKey TEXT DEFAULT '-', tsSecret TEXT DEFAULT '-',
  tsVerifyTTL INTEGER DEFAULT 1800
)`);

db.run(`CREATE TABLE IF NOT EXISTS FwResp (
  id INTEGER PRIMARY KEY, name TEXT DEFAULT '-', headers TEXT DEFAULT '-',
  status INTEGER DEFAULT 200, createAt INTEGER DEFAULT 0
)`);

db.run(`CREATE TABLE IF NOT EXISTS FWRule (
  id INTEGER PRIMARY KEY, mark TEXT DEFAULT '-', ip TEXT DEFAULT '-',
  path TEXT DEFAULT '-', method TEXT DEFAULT '-', headers TEXT DEFAULT '-',
  createAt INTEGER DEFAULT 0, save INTEGER DEFAULT 0, log INTEGER DEFAULT 0,
  country TEXT DEFAULT '-', active INTEGER DEFAULT 1, rate TEXT DEFAULT '-',
  trigger INTEGER DEFAULT 0, status TEXT DEFAULT '-', respId INTEGER DEFAULT -1
)`);

// Clear existing data
db.run('DELETE FROM System');
db.run('DELETE FROM FwResp');
db.run('DELETE FROM FWRule');

async function seed() {
  const { enc } = await import('../../../src/lib/crypto');
  const admUsr = await enc('tom');
  const admPwd = await enc('123qwe');
  const now = Date.now();

  db.run(`INSERT INTO System (id, admUsr, admPwd, tsEnabled, tsSiteKey, tsSecret, tsVerifyTTL,
    blogName, uploadDir, thumbDir, maxFireLogs)
    VALUES (1, ?, ?, 1, ?, ?, 1800, 'EMM Test', 'upload', 'thumb', 100)`,
    [admUsr, admPwd, KEYS.alwaysPass.site, KEYS.alwaysPass.secret]
  );
  console.log('✓ System seeded');

  const respId = now;
  db.run(`INSERT INTO FwResp (id, name, headers, status, createAt)
    VALUES (?, 'Block', '', 403, ?)`, [respId, now]);
  console.log(`✓ FwResp (id=${respId})`);

  const ruleId = now + 1;
  db.run(`INSERT INTO FWRule (id, mark, ip, path, method, headers, createAt, save,
    log, country, active, rate, trigger, status, respId)
    VALUES (?, 'E2E-Test', '', '/ts-trigger', '', '', ?, 0, 1, '', 1, '1/3600', 1, '', ?)`,
    [ruleId, now, respId]
  );
  console.log(`✓ Trigger rule (id=${ruleId})`);

  db.close();
  writeFileSync(DB_CFG, DB_PATH);
  console.log(`✓ .dbCfg → ${DB_PATH}\n`);
}

seed().catch((e) => {
  console.error('Setup failed:', e);
  process.exit(1);
});

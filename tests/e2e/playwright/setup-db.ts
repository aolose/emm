/**
 * Playwright test DB setup — runs with Bun before Playwright tests.
 * Seeds a test database with known credentials. The dev server then reads
 * .dbCfg to find this DB.
 *
 * Usage: bun run tests/e2e/playwright/setup-db.ts
 */
import { Database } from 'bun:sqlite';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const DB_PATH = resolve(import.meta.dir, 'test.db');
const DB_CFG = resolve(import.meta.dir, '../../..', '.dbCfg');

// Remove old config
try {
	if (existsSync(DB_CFG)) unlinkSync(DB_CFG);
} catch {}
// Remove old test db
try {
	if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
} catch {}

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
	tsVerifyTTL INTEGER DEFAULT 1800, cfAccountId TEXT DEFAULT '-',
	cfApiToken TEXT DEFAULT '-', cfListId TEXT DEFAULT '-'
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
	trigger INTEGER DEFAULT 0, status TEXT DEFAULT '-', respId INTEGER DEFAULT -1,
	uaMode INTEGER DEFAULT 0, ua TEXT DEFAULT '-', uaCount TEXT DEFAULT '-',
	schedule TEXT DEFAULT '-', cfUpload INTEGER DEFAULT 0
)`);

db.run('DELETE FROM System');
db.run('DELETE FROM FwResp');
db.run('DELETE FROM FWRule');

// Seed admin user (tom / 123qwe)
const { enc } = await import('../../../src/lib/crypto');
const admUsr = await enc('tom');
const admPwd = await enc('123qwe');

db.run(
	`INSERT INTO System (id, admUsr, admPwd, blogName, uploadDir, thumbDir)
	VALUES (1, ?, ?, 'EMM Playwright Test', 'upload', 'thumb')`,
	[admUsr, admPwd]
);

db.close();

writeFileSync(DB_CFG, DB_PATH);
console.log(`✓ Playwright test DB ready: ${DB_PATH}`);

/**
 * Update admin credentials.
 * Usage: bun run scripts/updatePwd.ts <username> <password>
 *
 * Reads pwdSalt from DB to match client-side encryption (set via +layout.ts).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Database } from 'bun:sqlite';
import { enc, setPwdSalt } from '../src/lib/crypto';

const usr = process.argv[2];
const pwd = process.argv[3];

if (!usr || !pwd) {
	console.log('Usage: bun run scripts/updatePwd.ts <username> <password>');
	process.exit(1);
}

const dbCfg = resolve('.dbCfg');
let dbPath: string;
try {
	dbPath = readFileSync(dbCfg, 'utf-8').trim();
} catch {
	console.error('.dbCfg not found');
	process.exit(1);
}
console.log('DB:', dbPath);

const db = new Database(dbPath);
const row = db.query('SELECT pwdSalt FROM System WHERE id=1').get() as Record<
	string,
	string
> | null;
const salt = row?.pwdSalt || '';
console.log('pwdSalt:', salt || '(none)');

if (salt && salt !== '-') setPwdSalt(salt);

const admUsr = await enc(usr);
const admPwd = await enc(pwd);
db.run('UPDATE System SET admUsr=?, admPwd=? WHERE id=1', [admUsr, admPwd]);
console.log(`Done. Login: ${usr} / ${pwd}`);
db.close();

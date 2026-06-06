import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const dbCfg = resolve('.dbCfg');
const dbPath = readFileSync(dbCfg, 'utf-8').trim();
const db = new Database(dbPath);

for (const col of [
	'r2Enabled INTEGER DEFAULT 0',
	'r2AccountId TEXT',
	'r2AccessKeyId TEXT',
	'r2SecretAccessKey TEXT',
	'r2Bucket TEXT',
	'r2PublicDomain TEXT'
]) {
	try {
		db.run(`ALTER TABLE System ADD COLUMN ${col}`);
		console.log(`  ADD ${col}`);
	} catch (e: any) {
		// column already exists — ok
		if (e.message.includes('duplicate')) console.log(`  SKIP ${col} (exists)`);
		else console.error(`  ERR ${col}:`, e.message);
	}
}
db.close();
console.log('done');

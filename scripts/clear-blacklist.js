import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Database } from 'bun:sqlite';

const dbCfg = resolve('.dbCfg');
const dbPath = readFileSync(dbCfg, 'utf-8').trim();
console.log('DB path:', dbPath);

const db = new Database(dbPath);

const row = db.query('SELECT COUNT(*) AS cnt FROM BlackList').get();
console.log('Blacklist entries before clear:', row.cnt);

db.run('DELETE FROM BlackList');
console.log('Blacklist cleared.');

const after = db.query('SELECT COUNT(*) AS cnt FROM BlackList').get();
console.log('Blacklist entries after clear:', after.cnt);

db.close();

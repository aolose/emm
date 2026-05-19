import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Database } from 'bun:sqlite';
import { enc, setPwdSalt } from '../src/lib/crypto';

const dbCfg = resolve('.dbCfg');
const dbPath = readFileSync(dbCfg, 'utf-8').trim();
console.log('DB path:', dbPath);

const db = new Database(dbPath);
const row = db.query('SELECT pwdSalt FROM System WHERE id=1').get();
const salt = row?.pwdSalt ?? null;
console.log('pwdSalt:', salt || 'none (legacy)');
if (salt && salt !== '-') setPwdSalt(String(salt));

const admUsr = await enc('tom');
const admPwd = await enc('123qwe');
db.run('UPDATE System SET admUsr=?, admPwd=? WHERE id=1', [admUsr, admPwd]);
console.log('Reset OK. Login: tom / 123qwe');
db.close();

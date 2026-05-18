import { enc, setPwdSalt } from './src/lib/crypto';
import { Database } from 'bun:sqlite';

const db = new Database('tests/e2e/e2e-1778916731952.db');
const row = db.query('SELECT pwdSalt FROM System WHERE id=1').get() as Record<string, string> | null;
const salt = row?.pwdSalt || '';
if (salt && salt !== '-') setPwdSalt(salt);
db.close();

const BASE = 'http://localhost:5173';
const usr = 'tom', pwd = '123qwe', v = '99999';
const u = await enc(await enc(usr) + v);
const p = await enc(await enc(pwd) + v);

const r = await fetch(BASE + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([u, p, v]),
});
console.log('Login:', r.status, await r.text());
console.log('Cookie:', r.headers.get('set-cookie') ? 'YES' : 'none');

import { Database } from 'bun:sqlite';

const db = new Database('blog.db');

// 1. Create FwResp with tsChallenge = true
const respId = Date.now();
db.run(`INSERT INTO FwResp (id, name, headers, status, createAt, tsChallenge) VALUES (?, 'Turnstile Challenge', '', 200, ?, 1)`, 
  [respId, Date.now()]);
console.log('FwResp created, id:', respId);

// 2. Create trigger rule: 3 hits in 60 seconds on any path → trigger Turnstile challenge
const ruleId = Date.now() + 1;
db.run(`INSERT INTO FWRule (id, mark, ip, path, method, headers, createAt, save, log, country, active, rate, trigger, status, respId) 
  VALUES (?, '', '', '', '', '', ?, 0, 1, '', 1, '3/60', 1, '', ?)`,
  [ruleId, Date.now(), respId]);
console.log('Trigger rule created, id:', ruleId, '→ respId:', respId);

// 3. Verify
const resp = db.query('SELECT id, name, tsChallenge FROM FwResp WHERE id=?').values(respId);
const rule = db.query('SELECT id, rate, trigger, respId FROM FWRule WHERE id=?').values(ruleId);
console.log('FwResp:', resp);
console.log('FWRule:', rule);

db.close();
console.log('\nNow run: bun --bun run vite dev');
console.log('Then visit http://localhost:5173/ multiple times quickly to trigger the rule.');

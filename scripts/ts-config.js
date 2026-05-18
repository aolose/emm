import { Database } from 'bun:sqlite';
const db = new Database('blog.db');
console.log('System:', db.query('SELECT tsEnabled,tsSiteKey,tsVerifyTTL FROM System WHERE id=1').values());
console.log('FwResp:', db.query('SELECT id,name,tsChallenge FROM FwResp').values());
console.log('Triggers:', db.query('SELECT id,rate,trigger,active,respId FROM FWRule WHERE trigger=1').values());
db.close();

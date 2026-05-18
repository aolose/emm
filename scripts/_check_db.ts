import { Database } from 'bun:sqlite';
const db = new Database('D:\\pandabank\\emm\\tests\\e2e\\e2e-1778916731952.db');
const row = db.query('SELECT admUsr, admPwd, pwdSalt, tsEnabled, tsSiteKey FROM System WHERE id=1').get() as any;
console.log('admUsr:', row?.admUsr?.substring(0, 30) + '...');
console.log('admPwd:', row?.admPwd?.substring(0, 30) + '...');
console.log('pwdSalt:', row?.pwdSalt);
console.log('tsEnabled:', row?.tsEnabled);
console.log('tsSiteKey:', row?.tsSiteKey);
db.close();

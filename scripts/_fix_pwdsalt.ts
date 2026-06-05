import { Database } from 'bun:sqlite';
const db = new Database('blog.db');
const row = db.query('SELECT pwdSalt FROM System WHERE id=1').get();
console.log('Before:', JSON.stringify(row));
db.run('UPDATE System SET pwdSalt=NULL WHERE id=1');
const row2 = db.query('SELECT pwdSalt FROM System WHERE id=1').get();
console.log('After:', JSON.stringify(row2));
db.close();

import { Database } from 'bun:sqlite';  
const db = new Database('blog.db');  
db.run(\"UPDATE System SET tsSiteKey = '1x00000000000000000000AA', tsSecret = '1x0000000000000000000000000000000AA' WHERE id = 1\");  
console.log('Restored'); db.close();  

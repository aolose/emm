import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const db = new Database(readFileSync(resolve('.dbCfg'), 'utf-8').trim());
const posts = db.query("SELECT id, content, desc FROM Post WHERE content LIKE '%r2.err.name%' OR desc LIKE '%r2.err.name%' LIMIT 5").all() as any[];
console.log('Articles with r2.err.name:', posts.length);
if (posts.length) {
    for (const p of posts) {
        const snippet = (p.content || '').replace(/\!\[.*\]\(/, '![...](');
        console.log(`Post ${p.id}:`, snippet.substring(0, 200));
        console.log('---');
    }
} else {
    // Check what's actually in the content
    const sample = db.query("SELECT content FROM Post LIMIT 1").get() as any;
    console.log('Sample content:', sample?.content?.substring(0, 200));
}
db.close();

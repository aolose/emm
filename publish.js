import fs from 'fs';

const env = '.env.production';
fs.copyFileSync(env, './dist/.env');
console.log('publish done!');

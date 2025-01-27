import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'node:fs';

const handler = resolve('dist/handler.js');
const h = readFileSync(handler, 'utf8');
writeFileSync(handler, h.replace('get_origin(request.headers)', 'URL.parse(request.url).origin'));

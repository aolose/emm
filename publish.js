import fs from 'fs';
import fes from 'fs-extra';
import pkg from './package.json' with { type: 'json' };
pkg.name = 'emm-blog';
pkg.keywords = ['svelte', 'blog', 'svelteKit-blog'];
pkg.homepage = 'https://github.com/aolose/emm';
pkg.description = 'A personal blog system built with SvelteKit';
delete pkg.devDependencies;
delete pkg.prepare;
delete pkg.private;
const env = '.env.production';
const lock = 'bun.lock';
const npm = '.npmrc';
pkg.scripts = {
	start: 'bun --trace-uncaught -r dotenv/config app dotenv_config_path=' + env
};
if (fs.existsSync('./dist')) fs.rmSync('./dist', { recursive: true });
fs.mkdirSync('./dist');
fes.moveSync('./app', './dist/app');
fs.copyFileSync(env, './dist/' + env);
fs.copyFileSync(npm + '.build', './dist/' + npm);
fs.copyFileSync(lock, './dist/' + lock);
fs.writeFileSync('./dist/package.json', JSON.stringify(pkg, null, ' '), { flag: 'w' });
if (fs.existsSync('.cssCache.json')) fs.rmSync('.cssCache.json');
console.log('publish done!');

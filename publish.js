import fs from 'fs';
import fes from 'fs-extra';
import p from './package.json' with { type: 'json' };

const env = '.env.production';
const lock = 'bun.lock';
const npm = '.npmrc';

const pkg = {
	name: 'blog',
	scripts: {
		start: `bun --trace-uncaught -r dotenv/config app dotenv_config_path=${env}`
	},
	type: 'module',
	dependencies: p.dependencies
};

if (fs.existsSync('./dist')) fs.rmSync('./dist', { recursive: true });
fs.mkdirSync('./dist');
fes.moveSync('./app', './dist/app');
fs.copyFileSync(env, './dist/' + env);
fs.copyFileSync(npm + '.build', './dist/' + npm);
fs.copyFileSync(lock, './dist/' + lock);
fs.writeFileSync('./dist/package.json', JSON.stringify(pkg), { flag: 'w' });
if (fs.existsSync('.cssCache.json')) fs.rmSync('.cssCache.json');
console.log('publish done!');

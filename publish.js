import fs from 'fs';
import fes from 'fs-extra';
import pkg from './package.json' assert { type: 'json' };

delete pkg.devDependencies;
delete pkg.name;
delete pkg.private;
delete pkg.version;
const env = '.env.production';
const lock = 'pnpm-lock.yaml';
const npm = '.npmrc';
pkg.scripts = {
	start: 'node --trace-uncaught -r dotenv/config app dotenv_config_path=' + env
};
if (fs.existsSync('./dist')) fs.rmSync('./dist', { recursive: true });
fs.mkdirSync('./dist');
fes.moveSync('./app', './dist/app');
fs.copyFileSync(env, './dist/' + env);
fs.copyFileSync(npm + '.build', './dist/' + npm);
fs.copyFileSync(lock, './dist/' + lock);
fs.writeFileSync('./dist/package.json', JSON.stringify(pkg), { flag: 'w' });
if(fs.existsSync('.cssCache.json'))fs.rmSync('.cssCache.json')
console.log('publish done!');

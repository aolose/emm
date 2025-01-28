import adapter from 'svelte-adapter-bun';
import { sveltePreprocess } from 'svelte-preprocess';
import fs from 'node:fs';
import { resolve } from 'path';

let nm = {};
const cssCacheFile = resolve('./.cssCache.json');
try {
	nm = JSON.parse(fs.readFileSync(cssCacheFile).toString());
} catch (e) {
	console.log(e.toString());
}
let i = 0,
	t;
const b = {};

function hashId(hash) {
	if (nm[hash]) {
		return (b[hash] = nm[hash]);
	} else {
		clearTimeout(t);
		t = setTimeout(function () {
			fs.writeFileSync(cssCacheFile, JSON.stringify(b));
		}, 300);
		return (b[hash] = (i++).toString(36));
	}
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: sveltePreprocess(),
	compilerOptions: {},
	kit: {
		files: {
			serviceWorker: 'src/sw.js'
		},
		serviceWorker: {
			register: false
		},
		adapter: adapter({ out: 'dist' })
	}
};

if (process.env.NODE_ENV !== 'development') {
	config.compilerOptions.cssHash = ({ hash, css }) => `_${hashId(hash(css))}`;
}
export default config;

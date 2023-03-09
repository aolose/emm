import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';
import fs from 'node:fs';

let nm = {};
const cssCacheFile = './.cssCache.json';
try {
	nm = JSON.parse(fs.readFileSync(cssCacheFile).toString());
} catch (e) {
	// ignore
}
let i = 10,
	t;
const b = {};

function uniqCssName(n) {
	if (nm[n]) {
		return (b[n] = nm[n]);
	} else {
		clearTimeout(t);
		t = setTimeout(function () {
			fs.writeFileSync(cssCacheFile, JSON.stringify(b));
		}, 300);
		return (b[n] = '_' + (i++).toString(36));
	}
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	compilerOptions: {
		cssHash: ({ hash, css }) => uniqCssName(hash(css))
	},
	preprocess: preprocess(),

	kit: {
		adapter: adapter({ out: 'app' })
	}
};

export default config;

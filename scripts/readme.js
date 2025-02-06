import { readFileSync, writeFileSync } from 'node:fs';
import pkg from '../package.json';

const readmePath = 'README.md';
const readme = readFileSync(readmePath).toString();

const dep = pkg.dependencies;
const dev = pkg.devDependencies;

writeFileSync(
	readmePath,
	readme.replace(/(?<=\/badge\/([^-]+)-)[^-]+/g, (version, pkg) => {
		if (pkg === 'sveltekit') pkg = '@sveltejs/kit';
		return dep[pkg] || dev[pkg] || version;
	})
);

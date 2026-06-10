/**
 * Generate static/template-hashes.json during build.
 *
 * Walks src/routes/(app)/ to discover all public-facing page routes.
 * For each route, hashes the full layout chain:
 *   - src/routes/+layout.svelte   (root layout)
 *   - src/routes/(app)/+layout.svelte  (group layout)
 *   - the route's +page.svelte
 *
 * Output: { "<SvelteKit route id>": "<sha256 hex>" }
 *
 * Route ID examples:
 *   /               → "/(app)" → hashes root layout + (app) layout + /(app)/+page.svelte
 *   /about          → "/(app)/about"
 *   /post/[slug]    → "/(app)/post/[[tag]]/[slug]"
 *   /posts/[page]   → "/(app)/posts/[[page]]"
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const ROUTES_DIR = join(import.meta.dirname, '..', 'src', 'routes');
const APP_DIR = join(ROUTES_DIR, '(app)');
// Output to build directory (deployed artifact)
const OUT_DIR = join(import.meta.dirname, '..', 'dist');
const OUT_FILE = join(OUT_DIR, 'template-hashes.json');

/** SHA-256 hex of file contents. */
function hashFile(path: string): string {
	const content = readFileSync(path, 'utf-8');
	return createHash('sha256').update(content).digest('hex').slice(0, 6);
}

/** Walk a directory recursively to find +page.svelte files. */
function findPages(dir: string, base: string): string[] {
	const results: string[] = [];
	// Check current directory for +page.svelte (handles group root)
	try {
		statSync(join(dir, '+page.svelte'));
		results.push(dir.slice(base.length).replace(/\\/g, '/'));
	} catch {
		/* no page at this directory level */
	}
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (!statSync(full).isDirectory()) continue;
		results.push(...findPages(full, base));
	}
	return results;
}

/** Resolve SvelteKit route ID from a directory path relative to routes/. */
function dirToRouteId(relDir: string): string {
	// SvelteKit route IDs keep the original directory structure with (groups)
	return relDir
		.replace(/\\/g, '/')
		.replace(/\/\+page\.svelte$/, '')
		|| '/';  // root
}

function main() {
	// Layout chain files (order matters — root first)
	const rootLayout = join(ROUTES_DIR, '+layout.svelte');
	const groupLayout = join(APP_DIR, '+layout.svelte');

	// Hash layout chain once — same for all routes except pages differ
	const rootHash = hashFile(rootLayout);
	const groupHash = hashFile(groupLayout);

	/** Compute combined template hash: SHA-256(layoutRootHash + layoutGroupHash + pageHash) */
	function templateHash(pageFile: string): string {
		const pageHash = hashFile(pageFile);
		const combined = `${rootHash}\n${groupHash}\n${pageHash}`;
		return createHash('sha256').update(combined).digest('hex').slice(0, 6);
	}

	// Discover all (app) page routes
	const pageDirs = findPages(APP_DIR, ROUTES_DIR);
	const hashes: Record<string, string> = {};

	for (const relDir of pageDirs) {
		const routeId = dirToRouteId(relDir);
		const pageFile = join(APP_DIR, relDir.replace(/^(\(app\)[\\/])?/, ''), '+page.svelte');
		// Resolve actual page file path
		const fullPageFile = join(ROUTES_DIR, relDir, '+page.svelte');
		hashes[routeId] = templateHash(fullPageFile);
	}

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(OUT_FILE, JSON.stringify(hashes, null, '\t') + '\n', 'utf-8');

	console.log(`[template-hashes] Generated ${OUT_FILE}`);
	for (const [id, hash] of Object.entries(hashes)) {
		console.log(`  ${id.padEnd(30)} → ${hash}`);
	}
}

main();

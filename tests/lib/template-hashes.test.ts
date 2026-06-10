import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dirname, '..', '..', 'scripts', 'generate-template-hashes.ts');
const OUT_FILE = join(import.meta.dirname, '..', '..', 'dist', 'template-hashes.json');

const EXPECTED_ROUTES = [
	'/(app)',
	'/(app)/about',
	'/(app)/post/[[tag]]/[slug]',
	'/(app)/posts/[[page]]',
	'/(app)/tag/[tag]/[[page]]',
	'/(app)/tags'
];

describe('generate-template-hashes script', () => {
	it('generates a valid JSON file', async () => {
		const proc = Bun.spawn(['bun', '--bun', 'run', SCRIPT], {
			cwd: join(import.meta.dirname, '..', '..')
		});
		await proc.exited;

		expect(proc.exitCode).toBe(0);
		expect(existsSync(OUT_FILE)).toBe(true);

		const raw = readFileSync(OUT_FILE, 'utf-8');
		const hashes = JSON.parse(raw);

		expect(typeof hashes).toBe('object');
	});

	it('contains all expected routes', async () => {
		// Re-run to ensure fresh
		const proc = Bun.spawn(['bun', '--bun', 'run', SCRIPT], {
			cwd: join(import.meta.dirname, '..', '..')
		});
		await proc.exited;
		// Small delay to ensure file is flushed
		await Bun.sleep(50);

		const hashes = JSON.parse(readFileSync(OUT_FILE, 'utf-8'));

		for (const route of EXPECTED_ROUTES) {
			expect(Object.keys(hashes)).toContain(route);
		}
	});

	it('produces 6-char hex hashes', async () => {
		const hashes = JSON.parse(readFileSync(OUT_FILE, 'utf-8'));

		for (const [route, hash] of Object.entries(hashes)) {
			expect(hash).toMatch(/^[a-f0-9]{6}$/);
		}
	});

	it('different routes produce different hashes', async () => {
		const hashes = JSON.parse(readFileSync(OUT_FILE, 'utf-8'));

		const values = Object.values(hashes) as string[];
		const unique = new Set(values);
		expect(unique.size).toBe(values.length);
	});
});

import { findEntry, resp, saveEntry, unZip } from '$lib/server/utils';
import { Database } from 'bun:sqlite';
import { resolve } from 'path';
import { server } from '$lib/server/index';
import { getErr } from '$lib/utils';
import type { System } from '$lib/server/model';
import { existsSync, readFileSync, rename, rmSync, unlinkSync, writeFileSync } from 'node:fs';

export const restore = async (data: ArrayBuffer) => {
	const files = unZip(new Uint8Array(data));
	const dbCfg = findEntry(files, '.dbCfg');
	if (!dbCfg) return resp('.dbCfg is missing', 500);
	const tmpCfg = `tmp_cfg_${Date.now()}`;
	await saveEntry(dbCfg, tmpCfg);
	const dbPath = readFileSync(tmpCfg).toString();
	const dbFile = findEntry(files, 'd');
	if (!dbFile) return resp('database is missing', 500);
	const tmp = `${Date.now()}.tmp`;
	await saveEntry(dbFile, tmp);
	let [thumbDir, uploadDir] = ['', ''];
	console.log('save db files');
	try {
		const db = new Database(tmp);
		const { thumbDir: t, uploadDir: u } =
			db.query<System, string[]>('select thumbDir,uploadDir from System').get() || {};
		if (t) thumbDir = resolve(t);
		if (u) uploadDir = resolve(u);
		db.close();
	} catch (e) {
		console.warn(e);
	}
	if (!thumbDir || !uploadDir) return resp('some directories are missing', 500);
	try {
		server.stop();
		unlinkSync(resolve(tmpCfg));
		unlinkSync(resolve(dbPath));
		rename(tmp, resolve(dbPath), console.warn);
		writeFileSync(resolve('.dbCfg'), dbPath);
		if (existsSync(thumbDir)) rmSync(thumbDir, { recursive: true, force: true });
		if (existsSync(uploadDir)) rmSync(uploadDir, { recursive: true, force: true });

		files.forEach((a) => {
			if (a.filename.match(/^u\/\w+$/))
				saveEntry(a, resolve(uploadDir, a.filename.replace(/.*\//, '')));
			if (a.filename.match(/^t\/\w+$/))
				saveEntry(a, resolve(thumbDir, a.filename.replace(/.*\//, '')));
		});
	} catch (e) {
		console.error(e);
		if (e instanceof Error) return resp(getErr(e), 500);
	}
	server.start(dbPath);
};

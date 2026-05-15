import { findEntry, resp, saveEntry, unArchive } from '$lib/server/utils';
import { Database } from 'bun:sqlite';
import { resolve } from 'path';
import { server } from '$lib/server/index';
import { getErr } from '$lib/utils';
import type { System } from '$lib/server/model';

/** Recursively delete all files in a directory using Bun APIs */
const cleanDir = async (dir: string) => {
	const glob = new Bun.Glob('**/*');
	for await (const f of glob.scan({ cwd: dir, absolute: true })) {
		await Bun.file(f).delete();
	}
};

export const restore = async (data: ArrayBuffer) => {
	const isMaintain = server.maintain;
	const files = await unArchive(new Uint8Array(data));
	const dbCfg = findEntry(files, '.dbCfg');
	if (!dbCfg) return resp('.dbCfg is missing', 500);
	const tmpCfg = `tmp_cfg_${Date.now()}`;
	await saveEntry(dbCfg, tmpCfg);
	const dbPath = await Bun.file(tmpCfg).text();
	const dbFile = findEntry(files, 'd.gz');
	if (!dbFile) return resp('database is missing', 500);
	const tmp = `${Date.now()}.tmp`;
	const compressed = await dbFile.read();
	await Bun.write(tmp, Bun.gunzipSync(compressed) as unknown as Uint8Array);
	let [thumbDir, uploadDir] = ['', ''];

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
		// Windows: file lock may not release immediately after DB close — retry
		for (let retry = 0; retry < 3; retry++) {
			try {
				await Bun.file(resolve(dbPath)).delete();
				break;
			} catch (e: unknown) {
				if (retry === 2) throw e;
				await Bun.sleep(100);
			}
		}
		await Bun.file(resolve(tmpCfg)).delete();
		await Bun.write(resolve(dbPath), Bun.file(tmp));
		await Bun.file(tmp).delete();
		await Bun.write(resolve('.dbCfg'), dbPath);
		if (await Bun.file(thumbDir).exists) await cleanDir(thumbDir);
		if (await Bun.file(uploadDir).exists) await cleanDir(uploadDir);

		files.forEach((a) => {
			if (a.filename.match(/^u\/\w+$/))
				saveEntry(a, resolve(uploadDir, a.filename.replace(/.*\//, '')));
			if (a.filename.match(/^t\/\w+$/))
				saveEntry(a, resolve(thumbDir, a.filename.replace(/.*\//, '')));
		});
	} catch (e) {
		console.error(e);
		server.maintain = isMaintain;
		if (e instanceof Error) return resp(getErr(e), 500);
	}
	server.start(dbPath);
};

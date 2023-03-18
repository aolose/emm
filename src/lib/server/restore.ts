import JSZip from 'jszip';
import { resp } from '$lib/server/utils';
import better from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { server } from '$lib/server/index';
import { getErr } from '$lib/utils';
import { Buffer } from 'buffer';

const fix = (a: string) => {
	return path.resolve(a);
};

export const restore = async (data: ArrayBuffer) => {
	const zip = await JSZip.loadAsync(data);
	const cfgPath = '.dbCfg';
	const cfg = zip.file(cfgPath);
	if (!cfg) return resp('.dbCfg is missing', 500);
	const dbPath = await cfg.async('string');
	const dbFile = zip.file(dbPath);
	if (!dbFile) return resp('database is missing', 500);
	const dbBuf = await dbFile.async('arraybuffer');
	const db = new better(Buffer.from(dbBuf));
	let { thumbDir, uploadDir } = db.prepare('select thumbDir,uploadDir from System').get() || {};
	db.close();
	if (!thumbDir || !uploadDir) return resp('some directories are missing', 500);
	thumbDir = fix(thumbDir);
	uploadDir = fix(uploadDir);
	server.stop();
	try {
		fs.writeFileSync(fix(dbPath), Buffer.from(dbBuf));
		fs.writeFileSync(fix(cfgPath), dbPath, { flag: 'w' });
		if (fs.existsSync(thumbDir)) fs.rmSync(thumbDir, { recursive: true, force: true });
		if (fs.existsSync(uploadDir)) fs.rmSync(uploadDir, { recursive: true, force: true });
		fs.mkdirSync(thumbDir, { recursive: true });
		fs.mkdirSync(uploadDir, { recursive: true });
	} catch (e) {
		console.error(e);
		if (e instanceof Error) return resp(getErr(e), 500);
	}
	const falls: string[] = [];
	for (const [pa, file] of Object.entries(zip.files)) {
		const p = path.resolve(pa);
		if ((p.startsWith(uploadDir) || p.startsWith(thumbDir)) && !file.dir) {
			try {
				fs.writeFileSync(p, await file.async('nodebuffer'), { flag: 'w' });
			} catch (e) {
				console.error(e);
				if (e instanceof Error) {
					falls.push(getErr(e));
				}
			}
		}
	}
	server.start(dbPath);
	if (falls.length) return falls;
};

import { resp } from '$lib/server/utils';
import { Database } from 'bun:sqlite';
import JSZip from 'jszip';
import fs from 'fs';
import { resolve } from 'path';
import { server } from '$lib/server/index';
import { getErr } from '$lib/utils';
import { Buffer } from 'buffer';
import type { System } from '$lib/server/model';

export const restore = async (data: ArrayBuffer) => {
	const zip = await JSZip.loadAsync(data);
  const cfgPath = '.dbCfg';
  const cfg = zip.file(cfgPath);
  if (!cfg) return resp('.dbCfg is missing', 500);
  const dbPath = await cfg.async('string');
  const dbFile = zip.file(dbPath);
  if (!dbFile) return resp('database is missing', 500);
  const dbBuf = await dbFile.async('arraybuffer');
  const tmp = resolve('tmp.db');
  let [thumbDir, uploadDir] = ['', ''];
  try {
    fs.writeFileSync(tmp, Buffer.from(dbBuf));
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
  server.stop();
  try {
    fs.rename(tmp, resolve(dbPath), console.warn);
    fs.writeFileSync(resolve(cfgPath), dbPath, { flag: 'w' });
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
    const p = pa && resolve(pa);
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

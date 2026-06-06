import type { APIRoutes } from '../../types';
import { db, sys } from '../index';
import { delFile, md5, model, pageBuilder, resp, saveFile } from '../utils';
import { isR2Configured } from '../cloudflare';
import { trim } from '$lib/utils';
import { Res } from '$lib/server/model';
import { auth, parseIds, mimeLookup } from './_common';
import { permission } from '$lib/enum';
import { eTags } from '$lib/server/cache';
import type { SQLQueryBindings } from 'bun:sqlite';

const { Admin, Read } = permission;

const apis: APIRoutes = {
	res: {
		delete: auth(Admin, async (req) => {
			const r = await parseIds(req);
			const recs = r.map((id) => db.get(new Res(id)));
			const { changes } = db.delByPk(Res, [...r]);
			await Promise.all(recs.map((rec) => delFile(rec.id, rec.r2Key)));
			const ids = new Set([...r]);
			for (const [k, v] of eTags) {
				if (ids.has(v)) eTags.delete(k);
			}
			return changes;
		}),
		post: auth(Read, async (req) => {
			let where: [string, ...SQLQueryBindings[]] | undefined;
			const d = await req.json();
			const { page, size } = d;
			let { type, name = '' } = d;
			const w = [];
			const v = [];
			name = trim(name);
			if (name) {
				w.push('name like ?');
				v.push(`%${name}%`);
			}
			if (type) {
				type = type.replace(/\*/g, '%');
				w.push('type like ?');
				v.push(type);
			}
			if (w.length) where = [w.join(' and '), ...v];
			return pageBuilder(
				page,
				size,
				Res,
				['save desc'],
				['id', 'name', 'size', 'type', 'thumb', 'r2Synced', 'r2Key'],
				where
			);
		})
	},
	up: {
		post: auth(Admin, async (req) => {
			const d = await req.formData();
			const f = d.get('file') as Blob;
			let tp = d.get('type') as string;
			const n = d.get('name') as string;
			if (!tp) tp = mimeLookup(n);
			const buf = new Uint8Array(await f.arrayBuffer());
			const res = new Res();
			res.md5 = md5(buf);
			const r = db.get(res);
			const r2Key = res.md5.substring(0, 6);
			if (r) {
				// Missing thumbnail? Generate it now
				if (!r.thumb && tp.startsWith('image/')) {
					try {
						const img = new Bun.Image(buf);
						const { width } = await img.metadata();
						if (width > 300) {
							const thumb = await img.resize(300).webp().bytes();
							const thumbOk = await saveFile(r.id, sys.thumbDir, thumb, r.r2Key || r2Key);
							if (thumbOk) { const up = new Res(); up.id = r.id; up.thumb = 1; db.save(up); }
						}
					} catch (e) {
						console.error('[upload] thumb gen(md5 dedup) failed for res', r.id, e);
					}
				}
				return isR2Configured() ? `${sys.r2PublicDomain}/${r.r2Key || r.id}` : r.id;
			}
			res.r2Key = r2Key;
			res.size = buf.length;
			res.name = n;
			res.type = tp;
			db.save(res);
			try {
				const r2Ok = await saveFile(res.id, sys.uploadDir, buf, r2Key, res.type);
				if (r2Ok) { res.r2Synced = 1; db.save(res); }
				if (tp.startsWith('image/')) {
					try {
						const img = new Bun.Image(buf);
						const { width } = await img.metadata();
						if (width > 300) {
							const thumb = await img.resize(300).webp().bytes();
							const thumbOk = await saveFile(res.id, sys.thumbDir, thumb, r2Key);
							if (thumbOk) {
								res.thumb = 1;
								db.save(res);
							} else {
								console.error('[upload] thumb save failed for res', res.id);
							}
						}
					} catch (e) {
						console.error('[upload] thumb generation failed for res', res.id, e);
					}
				}
			} catch (e) {
				console.error(e);
				db.del(res);
			}
			return isR2Configured() ? `${sys.r2PublicDomain}/${res.r2Key || res.id}` : res.id;
		})
	}
};

export default apis;

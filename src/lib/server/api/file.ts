import type { APIRoutes } from '../../types';
import { db, sys } from '../index';
import { delFile, getReqJson, md5, model, pageBuilder, resp, saveFile } from '../utils';
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
			const { changes } = db.delByPk(Res, [...r]);
			r.forEach(delFile);
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
				['id', 'name', 'size', 'type', 'thumb'],
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
			if (r) return r.id;
			res.size = buf.length;
			res.name = n;
			res.type = tp;
			db.save(res);
			try {
				saveFile(res.id, sys.uploadDir, buf);
				if (tp.startsWith('image/')) {
					try {
						const img = new Bun.Image(buf);
						const w = img.width;
						if (w > 300) {
							const thumb = await img.resize(300).toBuffer();
							saveFile(res.id, sys.thumbDir, thumb);
							res.thumb = 1;
							db.save(res);
						}
					} catch (e) {
						console.error(e);
					}
				}
			} catch (e) {
				console.error(e);
				db.del(res);
			}
			return res.id;
		})
	}
};

export default apis;

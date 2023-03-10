import better from 'better-sqlite3';
import { model } from '$lib/server/utils';
import { Post, Res } from '$lib/server/model';
import { db, sys } from '$lib/server';
import fs from 'fs';
import { reqPostCache, tagPostCache } from '$lib/server/cache';

const p = './src/lib/server/back/dist/';
const old = new better('./src/lib/server/back/errDB.db');
const ldR = () => {
	const ff = new Map<string, string>();
	const w: string[] = [];
	fs.readdirSync(p).forEach((a) => {
		if (a.includes('.')) w.push(a);
		else ff.set(a, '');
	});
	w.forEach((o) => {
		const id = o.split('.')[0] || '';
		if (ff.has(id)) ff.set(id, o);
	});
	const s = new Set<string>();
	db.all(model(Res)).forEach((a) => s.add(a.md5));
	const items = old.prepare('select size,type,id,name,date from res').all();
	const { uploadDir, thumbDir } = sys;
	items.forEach(({ size, id, type, name, date }) => {
		if (s.has(id) || !ff.has(id)) return;
		const t = ff.get(id);
		const r = model(Res, {
			md5: id,
			type: type.endsWith('gif') ? type : type.replace(/image\/.*/, 'image/webp'),
			name: name,
			size,
			save: date * 1000,
			thumb: t ? 1 : -1
		});
		db.save(r, { skipSave: true, create: true });
		fs.copyFileSync(p + id, uploadDir + '/' + r.id);
		if (t) fs.copyFileSync(p + t, thumbDir + '/' + r.id);
	});
};
const fixContent = (c: string) => {
	return c
		.replace(/\n{3,}/g, '\n\n')
		.replace(/\n\.+\n/, '\n\n')
		.replace(/!\((\w+)\) *\n\[(.*?)]/g, (_, b, c) => {
			const o = {
				type: '',
				size: 0,
				name: '',
				width: 0,
				height: 0
			};
			c.split('|').forEach((a: string) => {
				const [c, d] = a.split(':');
				switch (c) {
					case 't':
						o.type = d;
						break;
					case 'n':
						o.name = d;
						break;
					case 's':
						o.size = +d;
						break;
				}
				if (!d) {
					const [w, h] = c.split('x');
					if (/\d+/g.test(w)) {
						o.width = +w;
						if (/\d+/g.test(h)) o.height = +h;
					}
				}
			});
			if (/png|jpg|jpeg|webp|gif/i.test(o.type)) {
				if (o.width)
					return `<img src="/res/${getRes(b)}" alt="${o.name}" width="${o.width}" height="${
						o.height || ''
					}"/>`;
				return `![${o.name}](/res/${getRes(b)})`;
			} else
				return `<x-file name="${o.name}" size="${o.size}" src="/res/${getRes(b)}" type="${
					o.type
				}"/>`;
		});
};
const getRes = (m: string) => db.get(model(Res, { md5: m }))?.id || -1;
const loadP = () => {
	const ops = old
		.prepare(
			'select content,title,save_at,pub_content,created,tags,banner,desc,pub_title,slug,updated from arts'
		)
		.all();
	ops.forEach(
		({
			content,
			title,
			save_at,
			pub_content,
			created,
			tags,
			banner,
			desc,
			pub_title,
			slug,
			updated
		}) => {
			const np = model(Post, {
				title: pub_title,
				content: fixContent(pub_content),
				save: pub_content ? -1 : save_at * 1000,
				modify: updated * 1000,
				publish: updated * 1000,
				createAt: created * 1000,
				banner: banner && getRes(banner),
				desc: desc,
				content_d: pub_content ? null : fixContent(content),
				title_d: pub_title ? null : title,
				published: +!!pub_content,
				slug: slug
			} as Post);
			db.save(np, { skipSave: true, create: true });
			if (np.id) {
				reqPostCache.add(np.id, 1);
				if (tags) {
					const ts = tags.split(/[ ,;]/).filter((a: string) => a);
					tagPostCache.setTags(np.id, ts);
				}
			}
		}
	);
};
export const readRes = () => {
	ldR();
	loadP();
};

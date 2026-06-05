import type { RequestHandler } from '@sveltejs/kit';
import { resp } from '$lib/server/utils';
import { resolve } from 'path';
import { sys, db } from '$lib/server';
import { Res } from '$lib/server/model';
import { contentType } from '$lib/enum';
import { eTags } from '$lib/server/cache';

export const GET: RequestHandler = async ({ params, request }) => {
	const tag = request.headers.get('If-None-Match');
	if (tag && eTags.has(tag)) {
		return new Response(null, {
			status: 304,
			headers: {
				etag: tag,
				'cache-control': 'max-age=31536000'
			}
		});
	}
	const res = new Res();
	let p = params.res;
	let isThumb = false;
	if (p) {
		if (p.startsWith('_')) {
			p = p.slice(1);
			isThumb = true;
		}
		res.id = +p;
		const r = db.get(res);
		if (r) {
			let f: Uint8Array | undefined;
			const u = resolve(sys.uploadDir, p);
			const t = resolve(sys.thumbDir, p);
			if (isThumb && r.thumb) {
				const tf = Bun.file(t);
				if (await tf.exists) f = await tf.bytes();
			}
			if (!f) {
				const uf = Bun.file(u);
				if (await uf.exists) f = await uf.bytes();
			}
			const desc = 'content-disposition';
			const h = new Headers({
				'cache-control': 'max-age=31536000'
			});
			if (r.md5) {
				h.set('etag', r.md5);
				eTags.set(r.md5, r.id);
			}
			const name = encodeURIComponent(r.name);
			h.set(contentType, r.type);
			if (!/image|text|video/i.test(r.type || '')) {
				h.set(desc, `attachment; filename=${name}`);
			} else {
				h.set(desc, `inline; filename=${name}`);
			}
			return new Response(f as BodyInit, {
				headers: h
			});
		}
	}
	return resp('Resources not exist!', 404);
};

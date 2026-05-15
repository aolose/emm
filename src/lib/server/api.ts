import type { APIRoutes, curPost, Obj } from '../types';
import { db, server, sys } from './index';
import { genPubKey } from './crypto';
import {
	blogExp,
	checkStatue,
	combineResult,
	DBProxy,
	debugMode,
	delCookie,
	delFile,
	getClient,
	getIp,
	getReqJson,
	md5,
	mkdir,
	model,
	mv,
	pageBuilder,
	resp,
	saveFile,
	setToken,
	sqlFields,
	sysStatue,
	throwDbProxyError,
	uniqSlug
} from './utils';
import type { RespHandle } from '$lib/types';
import {
	BlackList,
	FwLog,
	FwResp,
	FWRule,
	Post,
	PostRead,
	Res,
	System,
	Tag,
} from '$lib/server/model';
/** Simple inline MIME type lookup by file extension */
const mimeLookup = (name: string): string => {
	const i = name.lastIndexOf('.');
	if (i === -1) return '';
	const ext = name.slice(i + 1).toLowerCase();
	return ({
		aac: 'audio/aac', avif: 'image/avif', avi: 'video/x-msvideo',
		bmp: 'image/bmp', bz: 'application/x-bzip', bz2: 'application/x-bzip2',
		css: 'text/css', csv: 'text/csv', doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		epub: 'application/epub+zip', gz: 'application/gzip',
		gif: 'image/gif', htm: 'text/html', html: 'text/html',
		ico: 'image/vnd.microsoft.icon', ics: 'text/calendar', jar: 'application/java-archive',
		jpeg: 'image/jpeg', jpg: 'image/jpeg', js: 'text/javascript',
		json: 'application/json', jsonld: 'application/ld+json',
		mid: 'audio/midi', midi: 'audio/midi', mjs: 'text/javascript',
		mp3: 'audio/mpeg', mp4: 'video/mp4', mpeg: 'video/mpeg',
		odp: 'application/vnd.oasis.opendocument.presentation',
		ods: 'application/vnd.oasis.opendocument.spreadsheet',
		odt: 'application/vnd.oasis.opendocument.text',
		oga: 'audio/ogg', ogv: 'video/ogg', ogx: 'application/ogg',
		opus: 'audio/opus', otf: 'font/otf', png: 'image/png',
		pdf: 'application/pdf', php: 'application/x-httpd-php',
		ppt: 'application/vnd.ms-powerpoint',
		pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		rar: 'application/vnd.rar', rtf: 'application/rtf',
		sh: 'application/x-sh', svg: 'image/svg+xml',
		tar: 'application/x-tar', tif: 'image/tiff', tiff: 'image/tiff',
		ts: 'video/mp2t', ttf: 'font/ttf', txt: 'text/plain',
		vsd: 'application/vnd.visio', wav: 'audio/wav', weba: 'audio/webm',
		webm: 'video/webm', webp: 'image/webp', woff: 'font/woff',
		woff2: 'font/woff2', xhtml: 'application/xhtml+xml',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		xml: 'application/xml', xul: 'application/vnd.mozilla.xul+xml',
		zip: 'application/zip', '7z': 'application/x-7z-compressed',
		md: 'text/markdown', yml: 'text/yaml', yaml: 'text/yaml',
		svelte: 'text/plain', tsx: 'text/plain', vue: 'text/plain',
	}[ext]) || '';
};

import { arrFilter, clipWords, diffObj, enc, legacyEnc, filter, getPain, trim } from '$lib/utils';
import { validate, formatErrors } from '$lib/server/validate';
import { contentType, dataType, permission } from '$lib/enum';
import { NULL } from '$lib/server/enum';
import { dirname, resolve } from 'path';
import { genToken } from '$lib/server/token';
import {
	addRule,
	blackLists,
	blockIp,
	delBlackList,
	delFwResp,
	delRule,
	filterLog,
	fw2log,
	fwRespLis,
	getFwResp,
	isIpBlocked,
	getLogCacheEntries,
	lsRules,
	patchDetailIpInfo,
	saveBlackList,
	setFwResp
} from '$lib/server/firewall';
import { geoClose, geoStatue, ipInfoStr, loadGeoDb } from '$lib/server/ipLite';
import { tagPatcher, tags } from '$lib/server/store';
import { get } from 'svelte/store';
import {
	eTags,
	getPostSibling,
	getPubTags,
	noAccessPosts,
	patchPostTags,
	readManager,
	reqPostCache,
	tagPostCache
} from '$lib/server/cache';
import { versionStrPatch } from '$lib/setStrPatchFn';
import { cmManager } from '$lib/server/comment';
import { postList, postPatch, pubPostList } from '$lib/server/posts';
import { restore } from '$lib/server/restore';
import { getRuv } from '$lib/server/puv';
import type { SQLQueryBindings } from 'bun:sqlite';

/** Parse a comma-separated string of numeric IDs from a request body */
const parseIds = async (req: Request): Promise<number[]> =>
	(await req.text())
		.split(',')
		.filter((a) => a)
		.map((v) => +v);

/** Build a SQL WHERE clause from a search string against title/content fields */
const buildSearchWhere = (
	sc: string|undefined,
	fields: { ft?: number; v: SQLQueryBindings[]; w: string[] }
): [string, ...SQLQueryBindings[]] | undefined => {
	sc = trim(sc);
	if (!sc) return fields.w.length ? [fields.w.join(' or '), ...fields.v] : undefined;
	const s = `%${sc}%`;
	if (!fields.ft || fields.ft & 1) {
		fields.w.push('(title like ? or title_d like ?)');
		fields.v.push(s, s);
	}
	if (!fields.ft || fields.ft & 2) {
		fields.w.push('(content like ? or content_d like ?)');
		fields.v.push(s, s);
	}
	return [fields.w.join(' or '), ...fields.v];
};

/** Serialize concurrent requests for the same draft to prevent race-condition duplicates */
const draftLocks = new Map<string, Promise<void>>();
async function withDraftLock(uuid: string, fn: () => Promise<void>): Promise<void> {
	const prev = draftLocks.get(uuid);
	let resolve: () => void;
	const next = new Promise<void>((r) => { resolve = r; });
	draftLocks.set(uuid, (prev || Promise.resolve()).then(() => next));
	try {
		await prev;
		await fn();
	} finally {
		resolve!();
		const cur = draftLocks.get(uuid);
		// Clean up if no newer lock has been queued
		if (cur === next || (cur && prev && cur === prev)) {
			draftLocks.delete(uuid);
		}
	}
}

/** Page size for hidden-posts listing */
const REQS_PAGE_SIZE = 4;
/** Default page size for post listing */
const POSTS_DEFAULT_SIZE = 10;
/** Page size for visitor listing */
const VISITOR_PAGE_SIZE = 20;
/** Max login attempts before exponential backoff kicks in */
const LOGIN_TRY_LIMIT = 3;
/** Base delay multiplier for login rate-limiting (ms) */
const LOGIN_DELAY_BASE = 10_000;

const auth = (ps: permission | permission[], fn: RespHandle) => (req: Request) => {
	if (!sysStatue) return resp('system uninitialized', 500);
	if (!debugMode) {
		const requires = new Set(([] as permission[]).concat(ps));
		const client = getClient(req);
		if (requires.size) {
			if (!client) return resp('invalid token:' + req.url, 401);
			if (!client.ok(Admin)) {
				for (const p of requires) {
					const s = client.ok(p);
					if (s) continue;
					else return resp('no permission', 401);
				}
			}
		}
	}
	return fn(req);
};

// todo: link flag to session
// need a clientMap
	const { Admin, Read } = permission;

const apis: APIRoutes = {
	alCm: {
		get: auth(Read, () => `${+sys?.comment || 0}${+sys?.cmCheck}`),
		post: auth(Admin, async (req) => {
			const a = await req.text();
			sys.comment = +a[0];
			sys.cmCheck = +a[1];
		})
	},
	cmLs: {
		get: cmManager.list
	},
	cm: {
		get: cmManager.get,
		post: cmManager.set,
		delete: cmManager.del
	},
	logout: {
		get: () => {
			const res = resp('');
			delCookie(res, 'token');
			return res;
		}
	},
	check: {
		get: (req) => {
			const c = getClient(req);
			let s = 0;
			if (c) {
				if (c.ok(permission.Read)) s = 2;
				if (c.ok(permission.Admin)) s = 1;
			}
			return s;
		}
	},
	statue: {
		get: (req) => {
			checkStatue();
			let s = 0;
			if (debugMode) s = 1;
			else {
				const c = getClient(req);
				if (c) {
					if (c.ok(permission.Read)) s = 2;
					if (c.ok(permission.Admin)) s = 1;
				}
			}
			return filter(
				{
					statue: s,
					sys: sysStatue,
					key: sys?.seoKey,
					desc: sys?.seoDesc,
					title: sys?.blogName,
					pwdSalt: sys?.pwdSalt
				},
				[],
				false
			);
		}
	},
	reqs: {
		// get allowed hidden posts
		post: async (req) => {
			let ids: number[] = [];
			let m = new Map<number, number>();
			const page = +((await req.text()) || 0);
			if (debugMode) {
				ids = noAccessPosts() || [];
			} else {
				const cli = getClient(req);
				if (cli) {
					const c = cli.getReqs();
					if (c) {
						const rq = reqPostCache.get({ reqId: [...c.keys()] });
						m = new Map();
						ids = [];
						rq.forEach((q) => {
							ids.push(q.targetId);
							m.set(q.targetId, c.get(q.reqId) || -1);
						});
					}
				}
			}
			if (ids.length)
				return pageBuilder(
					page,
					REQS_PAGE_SIZE,
					Post,
					['createAt desc'],
					['title', 'slug', '_p'],
					[`id in (${sqlFields(ids.length)})`, ...ids],
					(arr) => {
						arr.forEach((a) => {
							a._p = +(m.get(a.id) || -1);
						});
						return arr;
					}
				);
		}
	},
	log: {
		post: auth(Read, async (req) => {
			const t = (await req.json()) as FWRule & {
				type: number;
				page: number;
				size: number;
				t: number;
			};
			const { page, size, type } = t;
			const lgs = filterLog(type ? db.all(model(FwLog)).map(fw2log) : getLogCacheEntries(), t);
			const l = lgs.length;
			const total = Math.floor((l + t.size - 1) / t.size);
			const st = l - page * size;
			const d = lgs.slice(Math.max(st, 0), st + size).filter((a) => {
				return t.t ? a.createAt > t.t : 1;
			});
			if (t) {
				return { total, data: patchDetailIpInfo(d) };
			}
		})
	},
	bip: {
		post: auth(Read, async (req) => {
			const ip = await req.text();
			if (ip) {
				const o = isIpBlocked(ip);
				if (getFwResp(o?.respId)?.status === 403) return 1;
			}
		})
	},
	rule: {
		post: auth(Admin, async (req) => {
			const r = model(FWRule, await req.json());
			if ((r.ip && /^(::1|127\.0)/.test(r.ip)) || r.ip === getIp(req)) {
				return resp('invalid ip', 500);
			}
			addRule(r as FWRule);
			return r.id;
		})
	},
	bks: {
		post: auth(Read, async (req) => {
			const r = new Uint16Array(await req.arrayBuffer());
			const p = r[0];
			const s = r[1];
			return blackLists(p, s);
		})
	},
	blk: {
		post: auth(Admin, async (req) => {
			const b = model(BlackList, await req.json()) as BlackList;
			if (!b.id) return resp('id not exist', 500);
			saveBlackList(b);
		}),
		delete: auth(Admin, async (req) => {
			const ids = await parseIds(req);
			delBlackList(...ids);
		})
	},
	rules: {
		delete: auth(Admin, async (req) => {
			const ids = await parseIds(req);
			delRule(ids);
			return;
		}),
		post: auth(Read, async (req) => {
			const r = new Uint16Array(await req.arrayBuffer());
			const p = r[0];
			const s = r[1];
			const o = lsRules(p, s);
			o.items = arrFilter(o.items, [
				'id',
				'path',
				'headers',
				'ip',
				'mark',
				'country',
				'log',
				'active',
				'trigger',
				'status',
				'rate',
				'respId'
			]) as FWRule[];
			return o;
		})
	},
	login: {
		post: async (req) => {
			if (sysStatue < 2) return resp(-1, 500);
			const ip = getIp(req);
			const [q, sv] = blockIp('lg', ip);
			if (q[1]) {
				sv();
				return resp(q[1], 403);
			}
			const body = await getReqJson(req);
			if (!Array.isArray(body) || body.length !== 3) return resp('invalid request', 400);
			const [u, p, v] = body;
			if (typeof u !== 'string' || typeof p !== 'string' || typeof v !== 'string')
				return resp('invalid request', 400);
			// Try current hash first; fall back to legacy if salt not yet migrated.
			// Legacy hashes are upgraded only on explicit password change (setAdmin).
			let ok = (await enc(sys.admUsr + v)) === u && (await enc(sys.admPwd + v)) === p;
			if (!ok && !sys.pwdSalt) {
				ok = (await legacyEnc(sys.admUsr + v)) === u && (await legacyEnc(sys.admPwd + v)) === p;
			}
			if (ok) {
				const res = resp('');
				setToken(req, res, genToken(Admin));
				q[0] = 0;
				sv();
				return res;
			} else {
				q[0]++;
				q[1] = Math.floor(Math.pow(2, q[0] - LOGIN_TRY_LIMIT)) * LOGIN_DELAY_BASE;
				sv();
				return resp(q[1], 403);
			}
		}
	},
	dbPath: {
		post: async (req) => {
			if (sysStatue) return resp('', 403);
			const p = await req.text();
			if (!p) return 'empty path';
			const pa = resolve(p);
			const dir = dirname(pa);
			try {
				const err = mkdir(dir);
				if (!err) server.start(p);
				if (err) return err;
				else {
await Bun.write(resolve('.dbCfg'), p);
					checkStatue();
				}
			} catch (e) {
				return resp(e?.toString(), 500);
			}
		}
	},
	tagLS: {
		post: auth(Read, async () => {
			const ts = get(tags);
			return ts.map((t) => {
				const ps = tagPostCache.getPostIds(t.id);
				if (ps.length) {
					return {
						...t,
						_posts: db.all(model(Post), `id in (${sqlFields(ps.length)})`, ...ps).map((a) => ({
							id: a.id,
							title: a.title || a.title
						}))
					};
				}
				return filter(t, [], false);
			});
		})
	},
	tag: {
		post: auth(Admin, async (req) => {
			const ts = get(tags);
			let t: Tag | undefined;
			const tag = (await req.json()) as Tag;
			if (tag.id) {
				t = ts.find((a) => a.id === tag.id);
			}
			const { _posts } = tag;
			try {
				if (t) {
					await throwDbProxyError(Object.assign(t, filter(tag, ['banner', 'desc', 'name'], false)));
				} else ts.unshift(await throwDbProxyError((t = DBProxy(Tag, tag))));
			} catch (e) {
				if (e instanceof Error) {
					let msg = e.message;
					if (msg.includes('UNIQUE constraint')) msg = 'tag name exist';
					return resp(msg, 500);
				}
			}
			if (t && typeof _posts === 'string') {
				const ids = _posts
					.split(',')
					.map((a) => +a)
					.filter((a) => a);
				tagPostCache.setPosts(t.id, ids);
			}
			tags.set([...ts]);
		}),
		delete: auth(Admin, async (req) => {
			const id = +(await req.text());
			if (!id) return;
			const t = get(tags).find((t) => t.id === id);
			if (t) {
				tagPostCache.delete([], t.id);
				db.del(t);
				tags.update((tt) => tt.filter((a) => a.id !== id));
			}
		})
	},
	tags: {
		get: async (req) => {
			return getPubTags(getClient(req))
				.map((a) => a.name)
				.join();
		},
		post: auth(Read, async (req) => {
			const ver = +(await req.text());
			const r = tagPatcher(ver);
			return versionStrPatch(r);
		})
	},
	geo: {
		get: auth(Read, () => geoStatue())
	},
	posts: {
		get: async (req) => {
			const params = new URL(req.url).searchParams;
			const page = +(params.get('page') || 1);
			const size = +(params.get('size') || POSTS_DEFAULT_SIZE);
			const tag = decodeURI(params.get('tag') || '');
			const tagInfo = !!params.get('inf');
			const skips = noAccessPosts(getClient(req));
			return await pubPostList(page, size, tag, skips, tagInfo);
		},
		post: auth(Read, async (req) => {
			const d = await req.json();
			const { page, size, ft = 1 } = d;
			const w: string[] = [];
			const v: SQLQueryBindings[] = [];
			if (!getClient(req)?.ok(Admin)) {
				w.push('published=?');
				v.push(1);
			}
			const where = buildSearchWhere(d.sc || '', { ft, w, v });
			return postList(page, size, where);
		})
	},
	slug: {
		post: auth(Admin, async (req) => {
			const s = await req.text();
			const mt = s.match(/(\d*?),(.*)/);
			if (mt) {
				const [id, slug] = mt.slice(1);
				if (slug) return uniqSlug(+id, slug);
			}
		})
	},
	post: {
		get: async (req) => {
			const [slug, tag] = decodeURI(req.url).replace(/.*?\?/, '').split(',');
			if (slug) {
				const p = db.get(model(Post, { slug, published: 1 }));
				if (p) {
					if (tag) {
						if (!tagPostCache.getTags(p.id).find((a) => a.name === tag))
							return resp('tag not exist', 404);
					}
					const rp = reqPostCache.get({ postId: p.id }).map((a) => a.reqId);
					if (rp.length) {
						const cli = getClient(req);
						if (!cli || !cli.has({ type: permission.Post, _reqs: rp })) {
							return resp('You do not have permission to view this post', 403);
						}
					}
					p._cm = +(sys.comment && !(p.disCm || 0));
					const skips = noAccessPosts(getClient(req));
					const [pre, next] = getPostSibling(p.id, p.createAt, decodeURI(tag), skips || []);
					if (pre) p._u = pre;
					if (next) p._n = next;
					readManager.set(p.id, req);
					p._r = readManager.get(p.id);
					if (!p.desc) p._d = clipWords(await getPain(p.content), 140);
					return filter(
						patchPostTags([p])[0],
						[
							'banner',
							'_cm',
							'desc',
							'content',
							'_d',
							'createAt',
							'_tag',
							'title',
							'_u',
							'_n',
							'_r'
						],
						false
					);
				}
			}
			return resp('post not found', 404);
		},
		delete: auth(Admin, async (req) => {
			const i = new Uint16Array(await req.arrayBuffer());
			i.forEach(readManager.rm);
			return db.delByPk(Post, [...i]).changes;
		}),
		patch: auth(Admin, async (req) => {
			const t = await req.text();
			const data: string[] = [];
			let start = 0;
			const max = t.length;
			for (let end = 0; end < max && data.length < 3; end++) {
				if (t[end] === ',') {
					data.push(t.slice(start, end));
					start = end + 1;
				}
			}
			if (start < max) {
				data.push(t.slice(start));
			}
			if (data.length === 4) {
				return postPatch(+data[0], +data[1], +data[2], data[3]);
			} else {
				return resp('patch error', 500);
			}
		}),
		post: auth(Admin, async (req) => {
			const o = model(Post, await getReqJson(req)) as curPost;
			if (!o.id && o._) {
				// Serialize concurrent saves for the same draft uuid to prevent duplicates
				const uuid = String(o._);
				await withDraftLock(uuid, async () => {
					const existing = db.get(
						model(Post, { draftUuid: uuid })
					) as Post | undefined;
					if (existing) {
						o.id = existing.id;
					} else {
						o.draftUuid = uuid;
						const d = model(Post, o) as { id: number };
						db.save(d);
						// Copy back the assigned id so the outer code can use it
						if (!o.id && d.id) o.id = d.id;
					}
				});
			}
			const d = model(Post, o) as { id: number };
			db.save(d);
			// Clear draftUuid on publish — draft has served its purpose
			if (o._p && o.id) {
				const current = db.get(model(Post, { id: o.id })) as Post | undefined;
				if (current?.draftUuid) {
					current.draftUuid = NULL.TEXT;
					db.save(current, { skipSave: true });
				}
			}
			const v = diffObj(o as Post, d) as Obj<Post>;
			if (v) delete v.content;
			return filter(v, [], false);
		})
	},
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
	},
	hello: {
		async post(request) {
			const buf = await request.arrayBuffer();
			const [id, pk] = await genPubKey(buf);
			return combineResult(id, pk);
		}
	},

	setAdmin: {
		async post(req) {
			const cli = getClient(req);
			const isAdm = cli?.ok(Admin);
			if (!isAdm && (!sys || (sys.admUsr && sys.admPwd))) return resp('', 401);
			const d = await getReqJson(req);
			const vres = validate(d, { usr: 'string', pwd: 'string' });
			if (!vres.ok) return resp(formatErrors(vres.errors), 400);
			const { usr, pwd } = vres.data;
			if (usr && pwd) {
				sys.admUsr = await enc(usr);
				sys.admPwd = await enc(pwd);
				const res = resp('');
				checkStatue();
				if (!isAdm) setToken(req, res, genToken(Admin));
				return res;
			} else {
				return resp('username or password is empty', 400);
			}
		}
	},
	setUp: {
		post: auth(Admin, async (req) => {
			const p = await req.text();
			if (!p) return resp('invalid directory', 500);
			const [a, b] = p.split(',');
			if (!a || !b || a === b) return resp('invalid directory', 500);
			let err = mkdir(a);
			if (!err) err = mkdir(b);
			if (!err) {
				sys.uploadDir = a;
				sys.thumbDir = b;
			}
			checkStatue();
			return resp(err, err ? 500 : 200);
		})
	},
	setGeo: {
		post: auth(Admin, async (req) => {
			const p = await req.text();
			if (!p) {
				sys.ipLiteToken = '';
			} else {
				const [tk, ph] = p.split(',');
				if (tk) sys.ipLiteToken = tk;
				if (ph) sys.ipLiteDir = ph;
				checkStatue();
				loadGeoDb();
			}
			return '';
		})
	},
	sys: {
		get: auth(Read, (req) => {
			const ks = sysKs;
			if (getClient(req)?.ok(Admin)) ks.push('ipLiteToken');
			return filter(sys, ks);
		}),
		post: auth(Admin, async (req) => {
			const o = filter(await req.json(), sysKs) as System;
			let loadGeo;
			for (const [k, v] of Object.entries(o)) {
				const kk = k as keyof System;
				const n = trim(v as string);
				if (n && n !== sys[kk]) {
					const isGeo = 'ipLiteDir' === kk || 'ipLiteToken' === kk;
					if (isGeo) {
						geoClose();
					}
					if (['uploadDir', 'thumbDir', 'ipLiteDir'].includes(kk)) {
						const err = mv(sys[kk] as string, n);
						if (err) return resp(err, 500);
					}
					if (
						(kk === 'ipLiteDir' && sys[kk] !== o[kk]) ||
						(kk === 'ipLiteToken' && o[kk] !== sys[kk])
					)
						loadGeo = 1;
					(sys as Record<string, unknown>)[kk] = n;
				}
			}
			if (loadGeo && sys.ipLiteDir && sys.ipLiteToken) {
				loadGeoDb();
			}
		})
	},
	backup: {
		post: async (req) => {
			if (sysStatue >= 1 && !getClient(req)?.ok(Admin)) return resp('no permission', 401);
			const data = await req.arrayBuffer();
			return await restore(data);
		},
		get: auth(Admin, async () => {
			const f = await blogExp();
			return new Response(f, {
				status: 200,
				headers: new Headers({
'content-disposition': `attachment; filename=blog_${Date.now()}.tar`,
					[contentType]: dataType.binary
				})
			});
		})
	},
	home: {
		get() {
			return [sys.linkedin, sys.github, sys.blogBio];
		}
	},
	puv: {
		get: auth(Read, (req) => {
			const params = new URL(req.url).searchParams;
			const start = +(params.get('s') || '');
			const end = +(params.get('e') || '');
			const type = +(params.get('t') || '');
			if (!start || !end) return [];
			return getRuv(start, end, type);
		})
	},
	fwRsp: {
		get: auth(Read, () => fwRespLis()),
		post: auth(Admin, async (req) => {
			return setFwResp(model(FwResp, await req.json()));
		}),
		delete: auth(Admin, async (req) => {
			const id = +(await req.text());
			if (id) delFwResp(id);
		})
	},
	visitor: {
		get: auth(Read, (req) => {
			const params = new URL(req.url).searchParams;
			const id = params.get('id');
			const p = params.get('p') || 1;
			if (!id) return resp('no post id', 500);
			return pageBuilder(
				+p,
				VISITOR_PAGE_SIZE,
				PostRead,
				['createAt desc'],
				['ip', 'createAt', 'ua', '_geo'],
				['pid=?', +id],
				(a) => {
					a.forEach((c) => (c._geo = ipInfoStr(c.ip)));
					return a;
				}
			);
		})
	},
	about: {
		post: auth(Admin, async (req) => {
			sys.about = (await req.text()) || '';
		}),
		get() {
			return sys.about || '';
		}
	}
};
const sysKs: (keyof System)[] = [
	'blogName',
	'blogBio',
	'linkedin',
	'github',
	'robots',
	'uploadDir',
	'maxFireLogs',
	'thumbDir',
	'ipLiteDir',
	'seoKey',
	'seoDesc'
];
export const apiPath = Object.keys(apis);
export default apis;

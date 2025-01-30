import type { APIRoutes, curPost, Obj } from '../types';
import { db, server, sys } from './index';
import { genPubKey } from './crypto';
import { lookup } from 'mime-types';
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
import sharp from 'sharp';
import { Buffer } from 'buffer';
import {
	BlackList,
	FwLog,
	FwResp,
	FWRule,
	Post,
	PostRead,
	Require,
	Res,
	System,
	Tag,
	TokenInfo
} from '$lib/server/model';
import { arrFilter, clipWords, diffObj, enc, filter, getPain, trim } from '$lib/utils';
import { contentType, dataType, permission } from '$lib/enum';
import { dirname, resolve } from 'path';
import fs from 'fs';
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
	hitRules,
	logCache,
	lsRules,
	patchDetailIpInfo,
	saveBlackList,
	setFwResp
} from '$lib/server/firewall';
import { geoClose, geoStatue, ipInfoStr, loadGeoDb } from '$lib/server/ipLite';
import { tagPatcher, tags } from '$lib/server/store';
import { get } from 'svelte/store';
import {
	codeTokens,
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
let curPostFlag = [0, 0];
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
					title: sys?.blogName
				},
				[],
				false
			);
		}
	},
	genCode: {
		post: auth(Admin, async (req) => {
			const { expire = -1, type, times, reqs, share } = await req.json();
			const tk = genToken(type, {
				expire,
				times,
				share,
				code: true,
				_reqs: new Set(reqs.split(',').map((a: string) => +a))
			});
			const t = { ...tk };
			delete t.value;
			return t;
		})
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
					4,
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
	ticket: {
		// get client status
		get: (req) => {
			const cli = getClient(req);
			const share = codeTokens.share(3);
			if (cli) {
				cli.clear();
				const a = debugMode ? -1 : cli.tokens.get(Admin);
				const r = a || cli.tokens.get(Read);
				const p = a || cli.tokens.get(permission.Post);
				return {
					read: r ? r || -1 : undefined,
					admin: a ? a || -1 : undefined,
					post: p ? 1 : undefined,
					share
				};
			}
			return { share };
		},
		post: async (req) => {
			const code = await req.text();
			if (code) {
				const ks = ['type', 'expire', 'times'] as (keyof TokenInfo)[];
				const tk = codeTokens.get(code);
				if (tk) {
					const cli = getClient(req);
					if (cli?.has(tk)) return filter(tk, ks, false);
					const n = Date.now();
					let { expire, times } = tk;
					expire = expire || -1;
					times = times || -1;
					if (expire < 0 || expire > n) {
						if (times > 0) tk.times = times - 1;
						tk.used = (tk.used || 0) + 1;
						db.save(tk);
						if (times === 1) codeTokens.delete({ code });
						if (times) {
							const tt = filter(tk, ks, false);
							const re = resp(tt);
							setToken(req, re, tk as TokenInfo);
							return re;
						}
					}
					codeTokens.delete({ code });
				}
			}
			return resp('invalid code', 500);
		}
	},
	code: {
		delete: auth(Admin, async (req) => {
			return codeTokens.delete({
				id: (await req.text()).split(',').map((a) => +a)
			});
		}),
		get: auth(Admin, (req) => {
			const page = +(new URL(req.url).searchParams.get('page') || 1);
			return pageBuilder(page, 10, TokenInfo, ['createAt desc'], undefined, undefined, (c) => {
				type reqs =
					| number
					| {
							id: number;
							name?: string;
					  };
				type Tk = {
					value?: string;
					_reqs?: reqs[];
				};
				const b = c as Tk[];
				const tk = new Set<Tk>();
				const rq = new Set<number>();
				const n = new Map<number, Require>();
				b.forEach((a) => {
					if (a.value) {
						a._reqs = a.value.split(',').map((n) => {
							rq.add(+n);
							return +n;
						});
						tk.add(a);
						delete a.value;
					}
				});
				if (rq.size) {
					db.all(model(Require), `id in (${sqlFields(rq.size)})`, ...rq).forEach((k) =>
						n.set(k.id, k)
					);
					for (const t of tk) {
						t._reqs?.forEach((a, i, c) => {
							c[i] = {
								id: a as number,
								name: n.get(a as number)?.name
							};
						});
					}
				}
				return b as TokenInfo[];
			});
		})
	},
	require: {
		delete: auth(Admin, async (req) => {
			const ids = (await req.text()).split(',').map((a) => +a);
			const ks = new Set(reqPostCache.rm({ postId: ids }));
			return (
				db.delByPk(
					Require,
					ids.filter((a) => !ks.has(a))
				).changes + ks.size
			);
		}),
		post: auth(Admin, async (req) => {
			const token = model(Require, await req.json()) as Require;
			const { _postIds = '' } = token;
			const ids = _postIds.split(',').map((a) => +a);
			const id = token.id;
			try {
				db.save(token);
				reqPostCache.setPosts(token.id, ids);
			} catch (e) {
				if (e instanceof Error) {
					if (e.message.startsWith('UNIQUE constraint')) {
						return resp('name already exist', 500);
					}
				}
			}
			return id ? '' : `${token.id} ${token.createAt}`;
		}),
		get: auth(Read, async (req) => {
			const params = new URL(req.url).searchParams;
			const page = +(params.get('page') || 1) || 1;
			const name = decodeURI(params.get('name') || '');
			const type = decodeURI(params.get('type') || '');
			const where: string[] = [];
			const pm: unknown[] = [];
			if (name) {
				where.push('name like ?');
				pm.push(`%${name}%`);
			}
			if (type !== '') {
				where.push('type = ?');
				pm.push(+type);
			}
			const after =
				type === ''
					? (ls: Require[]) => {
							let ids: Set<number> = new Set();
							const mr = new Map<number, Require>();
							for (const r of ls) {
								const ds = reqPostCache.get({ reqId: r.id }).map((a) => a.targetId);
								if (ds.length) {
									ids = new Set([...ids, ...ds]);
									mr.set(r.id, r);
									r._posts = [];
								}
							}
							if (ids.size) {
								const vs = [...ids];
								const where = `id in (${sqlFields(vs.length)})`;
								db.all(model(Post), where, ...vs).forEach((a) => {
									reqPostCache.get({ postId: a.id }).forEach((n) => {
										mr.get(n.reqId)?._posts?.push({
											id: a.id,
											title: a.title || a.title_d,
											slug: a.slug
										});
									});
								});
							}
							return ls;
						}
					: undefined;
			const wh = where.length
				? ([where.join(' and '), ...pm] as [string, ...SQLQueryBindings[]])
				: undefined;
			return pageBuilder(
				page,
				10,
				Require,
				['createAt desc'],
				type === '' ? [] : ['id', 'name'],
				wh,
				after
			);
		})
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
			const lgs = filterLog(type ? db.all(model(FwLog)).map(fw2log) : logCache, t);
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
				const o = hitRules({ ip });
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
			const ids = (await req.text())
				.split(',')
				.filter((a) => a)
				.map((v) => +v);
			delBlackList(...ids);
		})
	},
	rules: {
		delete: auth(Admin, async (req) => {
			const ids = (await req.text())
				.split(',')
				.filter((a) => a)
				.map((v) => +v);
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
			const tryTimes = 3;
			const base = 1e4;
			const ip = getIp(req);
			const [q, sv] = blockIp('lg', ip);
			if (q[1]) {
				sv();
				return resp(q[1], 403);
			}
			const [u, p, v] = await getReqJson(req);
			if ((await enc(sys.admUsr + v)) === u && (await enc(sys.admPwd + v)) === p) {
				const res = resp('');
				setToken(req, res, genToken(Admin));
				q[0] = 0;
				sv();
				return res;
			} else {
				q[0]++;
				q[1] = Math.floor(Math.pow(2, q[0] - tryTimes)) * base;
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
					fs.writeFileSync(resolve('.dbCfg'), p);
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
			const page = +(params.get('page') || 1) || 1;
			const size = +(params.get('size') || 10) || 10;
			const tag = decodeURI(params.get('tag') || '');
			const tagInfo = !!params.get('inf');
			const skips = noAccessPosts(getClient(req));
			return await pubPostList(page, size, tag, skips, tagInfo);
		},
		post: auth(Read, async (req) => {
			const d = await req.json();
			let { sc = '' } = d;
			const { page, size, ft = 1 } = d;
			const w = [];
			const v = [];
			let where: [string, ...SQLQueryBindings[]] | undefined;
			if (!getClient(req)?.ok(Admin)) {
				w.push('published=?');
				v.push(1);
			}
			sc = trim(sc);
			if (sc) {
				const s = `%${sc}%`;
				if (!ft || ft & 1) {
					w.push('(title like ? or title_d like ?)');
					v.push(s, s);
				}
				if (!ft || ft & 2) {
					w.push('(content like ? or content_d like ?)');
					v.push(s, s);
				}
			}
			if (w.length) where = [w.join(' or '), ...v];
			return postList(page, size, where);
		})
	},
	slug: {
		post: auth(Admin, async (req) => {
			const s = await req.text();
			const mt = s.match(/(\d*?),(.*)/);
			if (mt) {
				const [id, slug] = mt.slice(1);
				return uniqSlug(+id, slug);
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
			const [flag, id] = curPostFlag;
			const o = model(Post, await getReqJson(req)) as curPost;
			if (!o.id) {
				if (flag === o._) {
					o.id = id;
				}
			}
			const d = model(Post, o) as { id: number };
			db.save(d);
			if (o._) curPostFlag = [o._, d.id];
			const v = diffObj(o as Post, d) as Obj<Post>;
			if (v) delete v.content;
			return filter(v, [], false);
		})
	},
	res: {
		delete: auth(Admin, async (req) => {
			const r = (await req.text()).split(',').map((a) => +a);
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
			if (!tp) tp = lookup(n) || '';
			const buf = Buffer.from(await f.arrayBuffer());
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
						const img = sharp(buf);
						const meta = await img.metadata();
						const w = meta.width || 0;
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
			const { usr, pwd } = d;
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
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					sys[kk] = n;
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
			const f = blogExp();
			const trs = new TransformStream();
			const wt = trs.writable.getWriter();
			f.on('data', (chunk) => {
				wt.write(chunk);
			});
			f.on('end', () => {
				wt.close();
			});
			return new Response(trs.readable, {
				status: 200,
				headers: new Headers({
					'content-disposition': `attachment; filename=blog_${Date.now()}.zip`,
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
				20,
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

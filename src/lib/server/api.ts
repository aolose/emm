import type { APIRoutes, curPost, Obj } from "../types";
import { db, server, sys } from "./index";
import { genPubKey } from "./crypto";
import {
  checkStatue,
  combineResult,
  DBProxy,
  debugMode,
  delCookie,
  getClient,
  getReqJson,
  md5,
  mkdir,
  model,
  pageBuilder,
  resp,
  saveFile,
  setToken,
  sqlFields,
  sysStatue,
  throwDbProxyError,
  uniqSlug
} from "./utils";
import type { RespHandle } from "$lib/types";
import sharp from "sharp";
import { Buffer } from "buffer";
import { FwLog, FWRule, Post, Require, Res, Tag, TokenInfo } from "$lib/server/model";
import { arrFilter, diffObj, enc, filter } from "$lib/utils";
import { permission } from "$lib/enum";
import path from "path";
import fs from "fs";
import { genToken } from "$lib/server/token";
import { addRule, blockIp, delRule, filterLog, fw2log, logCache, lsRules, ruleHit, rules } from "$lib/server/firewall";
import { loadGeoDb } from "$lib/server/ipLite";
import { publishedPost, tagPatcher, tags } from "$lib/server/store";
import { get } from "svelte/store";
import {
  codeTokens,
  combine,
  noAccessPosts,
  patchPostReqs,
  patchPostTags,
  reqPostCache,
  tagPostCache
} from "$lib/server/cache";
import { versionStrPatch } from "$lib/setStrPatchFn";
import { NULL } from "$lib/server/enum";
import { cmManager } from "$lib/server/comment";
import { pubPostList } from "$lib/server/posts";

const auth = (ps: permission | permission[], fn: RespHandle) => (req: Request) => {
  if (!sysStatue) return resp("system uninitialized", 403);
  if (!debugMode) {
    const requires = new Set(([] as permission[]).concat(ps));
    const client = getClient(req);
    if (requires.size) {
      if (!client) return resp("empty token", 403);
      if (!client.ok(Admin)) {
        for (const p of requires) {
          const s = client.ok(p);
          if (s) continue;
          else return resp("invalid token", 403);
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
    post: auth(Admin, async req => {
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
      const res = resp("");
      delCookie(res, "token");
      return res;
    }
  },
  statue: {
    get: (req) => {
      let s = 0;
      if (debugMode) s = 1;
      else {
        const c = getClient(req);
        if (c) {
          if (c.ok(permission.Admin) || c.ok(permission.Read)) s = 1;
        }
      }
      return `${s}${sys.codeLogin}`;
    }
  },
  genCode: {
    post: auth(Admin, async (req) => {
      const {
        expire,
        type,
        times,
        reqs,
        share
      } = await req.json();
      const tk = genToken(type, {
        expire,
        times,
        share,
        code: true,
        _reqs: new Set(reqs.split(",").map((a: string) => +a))
      });
      const t = { ...tk };
      delete t.value;
      return t;
    })
  },
  reqs: {
    // get allowed hidden posts
    post: async req => {
      let ids: number[] = [];
      let m = new Map<number, number>();
      const page = +(await req.text() || 0);
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
            rq.forEach(q => {
              ids.push(q.targetId);
              m.set(q.targetId, c.get(q.reqId) || -1);
            });
          }
        }
      }
      if (ids.length) return pageBuilder(page, 4, Post, ["createAt desc"],
        ["title", "slug", "_p"], [
          `id in (${sqlFields(ids.length)})`,
          ...ids
        ], arr => {
          arr.forEach(a => {
            a._p = +(m.get(a.id) || -1);
          });
          return arr;
        });
    }
  },
  ticket: {
    // get client status
    get: req => {
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
        const ks = ["type", "expire", "times"] as (keyof TokenInfo)[];
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
      return resp("invalid code", 403);
    }
  },
  code: {
    delete: auth(Admin, async req => {
      return codeTokens.delete({
        id: (await req.text()).split(",").map(a => +a)
      });
    }),
    get: auth(Admin, (req) => {
      const page = +(new URL(req.url).searchParams.get("page") || 1);
      return pageBuilder(page,
        10, TokenInfo,
        ["createAt desc"], undefined, undefined,
        c => {
          type reqs = number | {
            id: number,
            name?: string
          }
          type Tk = {
            value?: string, _reqs?: reqs[]
          }
          const b = c as Tk[];
          const tk = new Set<Tk>();
          const rq = new Set<number>();
          const n = new Map<number, Require>();
          b.forEach(a => {
            if (a.value) {
              a._reqs = a.value.split(",").map(n => {
                rq.add(+n);
                return +n;
              });
              tk.add(a);
              delete a.value;
            }
          });
          if (rq.size) {
            db.all(model(Require), `id in (${sqlFields(rq.size)})`, ...rq)
              .forEach(k => n.set(k.id, k));
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
    delete: auth(Admin, async req => {
      const ids = (await req.text()).split(",").map(a => +a);
      const ks = new Set(reqPostCache.rm({ postId: ids }));
      return db.delByPk(Require, ids.filter(a => !ks.has(a))).changes + ks.size;
    }),
    post: auth(Admin, async (req) => {
      const token = model(Require, await req.json()) as Require;
      const { _postIds = "" } = token;
      const ids = _postIds.split(",").map(a => +a);
      const id = token.id;
      try {
        db.save(token);
        reqPostCache.setPosts(token.id, ids);
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.startsWith("UNIQUE constraint")) {
            return resp("name already exist", 500);
          }
        }
      }
      return id ? "" : `${token.id} ${token.createAt}`;
    }),
    get: auth(Read, async (req) => {
      const params = new URL(req.url).searchParams;
      const page = +(params.get("page") || 1);
      const name = params.get("name");
      const type = params.get("type");
      const where: string[] = [];
      const pm: unknown[] = [];
      if (name) {
        where.push("name like ?");
        pm.push(`%${name}%`);
      }
      if (type !== null) {
        where.push("type = ?");
        pm.push(+type);
      }
      const after = type === null ? (ls: Require[]) => {
        let ids: Set<number> = new Set();
        const mr = new Map<number, Require>();
        for (const r of ls) {
          const ds = reqPostCache.get({ reqId: r.id }).map(a => a.targetId);
          if (ds.length) {
            ids = new Set([...ids, ...ds]);
            mr.set(r.id, r);
            r._posts = [];
          }

        }
        if (ids.size) {
          const vs = [...ids];
          const where = `id in (${sqlFields(vs.length)})`;
          db.all(model(Post), where, ...vs).forEach(a => {
            reqPostCache.get({ postId: a.id }).forEach(n => {
              mr.get(n.reqId)?._posts?.push({ id: a.id, title: a.title || a.title_d, slug: a.slug });
            });
          });
        }
        return ls;
      } : undefined;
      const wh = where.length ?
        [where.join(" and "), ...pm] as [string, ...unknown[]] : undefined;
      return pageBuilder(page, 10, Require,
        ["createAt desc"],
        type === null ? [] : ["id", "name"]
        , wh, after);
    })
  },
  log: {
    post: auth(Read, async (req) => {
      const t = (await req.json()) as FWRule & { type: number, page: number, size: number, t: number };
      const { page, size, type } = t;
      const lgs = filterLog(type ? db.all(model(FwLog)).map(fw2log) : logCache, t);
      const l = lgs.length;
      const total = Math.floor((l + t.size - 1) / t.size);
      const st = l - page * size;
      const d = lgs.slice(Math.max(st, 0), st + size)
        .filter(a => {
          return t.t ? a[0] > t.t : 1;
        });
      if (t) {
        return { total, data: d };
      }
    })
  },
  bip: {
    post: auth(Read, async req => {
      const ip = await req.text();
      if (ip) {
        const o = ruleHit({ ip });
        if (o?.forbidden) return 1;
      }
    })
  },
  rule: {
    post: auth(Admin, async req => {
      const r = model(FWRule, await req.json());
      addRule(r as FWRule);
      return r.id;
    })
  },
  rules: {
    delete: auth(Admin, async req => {
      const ids = (await req.text()).split(",").filter(a => a).map(v => +v);
      delRule(ids);
      return;
    }),
    post: auth(Read, async (req) => {
      const r = new Uint8Array(await req.arrayBuffer());
      const p = r[0];
      const s = r[1];
      return {
        items: arrFilter(lsRules(p, s), ["id", "path", "headers", "ip", "mark",
          "country", "log", "active", "forbidden"]),
        total: Math.ceil(rules.length / s)
      };
    })
  },
  login: {
    post: async (req) => {
      if (sysStatue < 2) return resp(-1, 403);
      const tryTimes = 3;
      const base = 1e4;
      const ip = req.headers.get("x-forwarded-for") || "";
      const [q, sv] = blockIp("lg", ip);
      if (q[1]) {
        sv();
        return resp(q[1], 403);
      }
      const [u, p, v] = await getReqJson(req);
      if (await enc(sys.admUsr + v) === u && await enc(sys.admPwd + v) === p) {
        const res = resp("");
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
      if (sysStatue) return resp("", 403);
      const p = await req.text();
      if (!p) return "empty path";
      const pa = path.resolve(p);
      const dir = path.dirname(pa);
      try {
        const ex = fs.existsSync(dir);
        if (!ex) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const err = server.start(p);
        if (err) return err;
        else {
          fs.writeFileSync(".dbCfg", p);
          checkStatue();
        }
      } catch (e) {
        return resp(e?.toString(), 500);
      }
    }
  },
  tagLS: {
    post: auth(Read, async req => {
      const ts = get(tags);
      return ts.map(t => {
        const ps = tagPostCache.getPostIds(t.id);
        if (ps.length) {
          return {
            ...t,
            _posts: db.all(model(Post), `id in (${sqlFields(ps.length)})`, ps).map(a => ({
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
    post: auth(Admin, async req => {
      const ts = get(tags);
      let t: Tag | undefined;
      const tag = await req.json() as Tag;
      if (tag.id) {
        t = ts.find(a => a.id === tag.id);
      }
      const { _posts } = tag;
      try {
        if (t) {
          await throwDbProxyError(Object.assign(t, filter(tag, ["banner", "desc","name"], false)));
        } else ts.unshift(await throwDbProxyError(t = DBProxy(Tag, tag)));
      } catch (e) {
        if (e instanceof Error) {
          let msg = e.message;
          if (msg.includes("UNIQUE constraint")) msg = "tag name exist";
          return resp(msg, 500);
        }
      }
      if (t && typeof _posts === "string") {
        const ids = _posts.split(",").map(a => +a).filter(a => a);
        tagPostCache.setPosts(t.id, ids);
      }
      tags.set([...ts]);
    }),
    delete: auth(Admin, async req => {
      const id = +await req.text();
      if (!id) return;
      const t = get(tags).find(t => t.id === id);
      if (t) {
        tagPostCache.delete([], t.id);
        db.del(t);
        tags.update(tt => tt.filter(a => a.id !== id));
      }
    })
  },
  tags: {
    get: async req => {
      const ps = get(publishedPost);
      const ids = new Set(noAccessPosts(getClient(req)) || []);
      return tagPostCache.getTags([...ps]).filter(a => {
        const ia = new Set(tagPostCache.getPostIds(a.id));
        for (const i of ia) {
          if (ids.has(i)) ia.delete(i);
        }
        return ia.size;
      }).map(a => a.name).join();
    },
    post: auth(Read, async req => {
      const ver = +(await req.text());
      const r = tagPatcher(ver);
      return versionStrPatch(r);
    })
  },
  posts: {
    get: async req => {
      const params = new URL(req.url).searchParams;
      const page = +(params.get("page") || 1);
      const size = +(params.get("size") || 10);
      const tag = params.get("tag");
      const skips = noAccessPosts(getClient(req));
      return pubPostList(page, size, tag, skips);
    },
    post: auth(Read, async (req) => {
      const {
        page, size
      } = await req.json();
      let where: [string, ...unknown[]] | undefined;
      if (!getClient(req)?.ok(Admin)) {
        where = ["published=? ", 1];
      }

      return pageBuilder(page, size, Post,
        ["createAt desc"], undefined, where,
        combine(patchPostTags, patchPostReqs)
      );
    })
  },
  slug: {
    post: auth(Admin, async req => {
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
      const slug = req.url.replace(/.*?\?/, "");
      if (slug) {
        const p = db.get(model(Post, { slug }));
        if (p) {
          const rp = reqPostCache.get({ postId: p.id }).map(a => a.reqId);
          if (rp.length) {
            const cli = getClient(req);
            if (!cli || !cli.has({ type: permission.Post, _reqs: rp })) {
              return resp("You do not have permission to view this post", 403);
            }
          }
          p._cm = +(sys.comment && !(p.disCm || 0));
          return filter(patchPostTags([p])[0], [
            "banner", "_cm", "desc",
            "content", "createAt",
            "_tag", "title"
          ], false);
        }
      }
      return resp("post not found", 404);
    },
    delete: auth(Admin, async (req) => {
      const i = new Uint8Array(await req.arrayBuffer());
      return db.delByPk(Post, [...i]).changes;
    }),
    post: auth(Admin, async (req) => {
      const [flag, id] = curPostFlag;
      const o = model(Post, await getReqJson(req)) as curPost;
      if (!o.id) {
        if (flag === o._) {
          o.id = id;
        } else o.id = NULL.INT;
      }
      const d = model(Post, o) as { id: number };
      db.save(d);
      if (o._) curPostFlag = [o._, d.id];
      return filter(diffObj(o as Post, d) as Obj<Post>, [], false);
    })
  },
  res: {
    delete: auth(Admin, async (req) => {
      const r = new Uint8Array(await req.arrayBuffer());
      const { changes } = db.delByPk(Res, [...r]);
      return changes;
    }),
    post: auth(Read, async (req) => {
      let where: [string, ...unknown[]] | undefined;
      let type = req.headers.get("filetype");
      if (type) {
        type = type.replace(/\*/g, "%");
        where = ["type like ?", type];
      }
      const r = new Uint8Array(await req.arrayBuffer());
      const p = r[0];
      const s = r[1];
      return pageBuilder(p, s, Res,
        ["save desc"],
        ["id", "name", "size", "type", "thumb"],
        where
      );
    })
  },
  up: {
    post: auth(Admin, async (req) => {
      const d = await req.formData();
      const f = d.get("file") as Blob;
      const n = d.get("name") as string;
      const buf = Buffer.from(await f.arrayBuffer());
      const res = new Res();
      res.md5 = md5(buf);
      const r = db.get(res);
      if (r) return r.id;
      res.size = buf.length;
      res.name = n;
      res.type = f.type;
      db.save(res);
      try {
        saveFile(res.id, sys.uploadDir, buf);
        if (f.type.startsWith("image/")) {
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
    // todo set cookie
    async post(req) {
      if (!sys || (sys.admUsr && sys.admPwd)) return resp("", 403);
      const d = await getReqJson(req);
      const { usr, pwd } = d;
      if (usr && pwd) {
        sys.admUsr = await enc(usr);
        sys.admPwd = await enc(pwd);
        const res = resp("");
        checkStatue();
        setToken(req, res, genToken(Admin));
        return res;
      } else {
        return resp("username or password is empty", 500);
      }
    }
  },
  setUp: {
    // todo auth need
    post: auth(Admin, async (req) => {
      const p = await req.text();
      if (!p) return resp("invalid directory", 500);
      const [a, b] = p.split(",");
      if (!a || !b || a === b) return resp("invalid directory", 500);
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
    post: auth(Admin, async req => {
      const p = await req.text();
      if (!p) {
        sys.ipLiteToken = "";
      } else {
        const [tk, ph] = p.split(",");
        if (tk) sys.ipLiteToken = tk;
        if (ph) sys.ipLiteDir = ph;
        checkStatue();
        loadGeoDb();
      }
      return "";

    })
  }
};

export const apiPath = Object.keys(apis);
export default apis;

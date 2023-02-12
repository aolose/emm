import { delCookie, getClient, getCookie, model, pageBuilder, resp, sqlFields } from "$lib/server/utils";
import { CmUser, Comment, Post } from "$lib/server/model";
import { db, sys } from "$lib/server/index";
import { randomUUID } from "crypto";
import { filter } from "$lib/utils";
import { cmStatus, permission } from "$lib/enum";

export const cmManager = (() => {
  const expire = 1e3 * 3600 * 24; // d
  const ck = "cm-tk";
  const userCache = new Map<number, { name: string, avatar: number }>();
  const getUser = (id: number) => {
    const u = userCache.get(id);
    if (u) return u as CmUser;
    const us = db.get(model(CmUser, { id }));
    if (us) {
      userCache.set(us.id, { avatar: us.avatar, name: us.name });
    }
  };
  const errMsg = (msg = "", keepToken = false) => {
    const r = resp(msg, 403);
    if (!keepToken) delCookie(r, ck);
    return r;
  };

  function getTk(req: Request) {
    return getCookie(req, ck);
  }

  let clear = 0;
  setInterval(() => {
    if (clear) {
      const n = Date.now();
      db.db.prepare(`delete from CmUser where del=? and exp<?`).run(1, n);
      clear = 0;
    }
  }, 1e3 * 3600 * 12);
  return {
    list: async (req: Request) => {
      const params = new URL(req.url).searchParams;
      const slug = params.get("slug");
      const page = +(params.get("page") || 1);
      const p = slug && db.get(model(Post, { slug }));
      const isAdmin = getClient(req)?.ok(permission.Admin);
      if (!p && !isAdmin) return errMsg("post not exist", true);
      const where: string[] = [];
      const values: unknown[] = [];
      if (p) {
        where.push("postId=?");
        values.push(p.id);
      }
      const ks: (keyof Comment)[] = [];
      if (!isAdmin) {
        if (sys.cmCheck) {
          where.push("state=?");
          values.push(cmStatus.Approve);
        } else {
          where.push("state !=?");
          values.push(cmStatus.Reject);
        }
        ks.push("id", "reply", "_avatar", "_name", "content", "createAt");
      }
      const w = where.length ? [where.join(" and "), ...values] as [string, ...unknown[]] : undefined;
      return pageBuilder(page,
        10, Comment,
        ["createAt desc"],
        ks, w, arr => {
          const postCache = new Map<number, { title: string, slug: string }>();
          arr.forEach(a => {
            const u = getUser(a.userId) as CmUser;
            a._avatar = u.avatar;
            a._name = u.name;
            if (!slug) {
              let p = postCache.get(a.postId);
              if (!p) {
                const v = db.get(model(Post, { id: a.postId }));
                if (v) {
                  p = { title: v.title, slug: v.slug };
                  postCache.set(a.postId, p);
                }
              }
              if (p) {
                a._post = p;
              }
            }
          });
          return arr;
        });
    },
    del: async (req: Request) => {
      const now = Date.now();
      const isAdm = getClient(req)?.ok(permission.Admin);
      const tk = getTk(req);
      const ids = req.url
        .replace(/^.*?\?/, "")
        .split(",").map(a => +a).filter(a => a);
      if (!ids.length) return;
      if (isAdm) {
        const u0 = new Set(db.all(model(Comment), `id in (${sqlFields(ids.length)})`, ...ids).map(a => a.userId));
        db.delByPk(Comment, [ids]);
        const u1 = new Set(db.all(model(Comment), `userId in (${sqlFields(u0.size)})`, ...u0).map(a => a.userId));
        for (const u of u1) {
          u0.delete(u);
        }
        if (u0.size) {
          clear = 1;
          db.db.prepare(`update CmUser set del=? where id in (${sqlFields(u0.size)})`)
            .run(1, ...u0);
        }
      } else {
        if (!tk) return errMsg("no permission");
        const id = ids[0];
        if (id) {
          const cm = db.get(model(Comment, { id }));
          if (!cm) return errMsg("comment not exist", true);
          const usr = db.get(model(CmUser, { id: cm.userId }));
          if (!usr) {
            return errMsg("invalid token");
          }
          if (usr.exp > now) {
            db.delByPk(Comment, [cm.id]);
            if (!db.get(model(Comment, { userId: usr.id }))) {
              usr.del = 1;
              clear = 1;
              db.save(usr);
            }
          } else return errMsg("token expire");
        }
      }
    },
    get: (req: Request) => {
      const id = +req.url.replace(/.*?\?/, "");
      if (id) {
        const cm = db.get(model(Comment, { id }));
        if (cm) {
          const user = db.get(model(CmUser, { id: cm.userId })) as CmUser;
          cm._avatar = user.avatar;
          cm._name = user.name;
          return filter(cm, ["_avatar", "_name", "content", "createAt", "save"]);
        }
      }
      return resp("comment not exist", 404);
    },
    set: async (req: Request) => {
      const n = Date.now();
      const tk = getTk(req);
      const cm = model(Comment, await req.json());
      let user = model(CmUser, { token: tk }) as CmUser;
      const isAdm = getClient(req)?.ok(permission.Admin);
      if (isAdm) {
        cm.userId = 0;
        cm.isAdm = 1;
      } else {
        if (cm.isAdm) return errMsg("forbidden");
        if (tk) {
          user = db.get(user) as CmUser;
          if (!user || user.exp < n) return errMsg("invalid cookie");
          if (cm.id) {
            const c = db.get(model(Comment, { id: cm.id }));
            if (!c) return errMsg("comment not exist");
          }
        } else {
          if (cm.id) return errMsg("no permission", true);
          user.token = randomUUID();
        }
        const p = cm.postId && db.get(model(Post, { id: cm.postId }));
        if (!p || !p.published) return errMsg("post not exist", true);
        if (cm._avatar) user.avatar = cm._avatar;
        if (cm._name) user.name = cm._name;
        cm.userId = user.id;
        user.exp = expire + n;
        user.del = -1;
        db.save(user);
      }
      db.save(cm);
    }
  };
})();

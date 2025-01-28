import {
  delCookie,
  expDay,
  getClient,
  getCookie,
  getIp,
  model,
  pageBuilder,
  resp,
  setCookie,
  sqlFields
} from '$lib/server/utils';
import { CmUser, Comment, Post } from '$lib/server/model';
import { db, sys } from '$lib/server/index';
import { randomUUID } from 'crypto';
import { filter, trim } from '$lib/utils';
import { cmStatus, permission } from '$lib/enum';
import type { Obj } from '$lib/types';
import { ipInfoStr } from '$lib/server/ipLite';
import type { SQLQueryBindings } from 'bun:sqlite';
const fixOwn = (uid: number, a: Obj<Comment>, isAdm?: boolean) => {
  if (uid && uid === a.userId) {
    a._own = 1;
  } else if (isAdm) {
    if (a.isAdm) a._own = 1;
    else a._own = 2;
  }
  if (!a._own && !isAdm) delete (a as { state?: number }).state;
};
export const cmManager = (() => {
  const expire = 1e3 * 3600 * 24; // d
  const ck = 'cm-tk';
  const userCache = new Map<number, { name: string; avatar: number }>();
  const getUser = (id: number) => {
    const u = userCache.get(id);
    if (u) return u as CmUser;
    const us = db.get(model(CmUser, { id }));
    if (us) {
      userCache.set(us.id, { avatar: us.avatar, name: us.name });
    }
    return us;
  };
  const errMsg = (msg = '', keepToken: boolean | 0 | 1 = false, status = 500) => {
    const r = resp(msg, status);
    if (!keepToken) delCookie(r, ck);
    return r;
  };

  function getTk(req: Request) {
    return getCookie(req, ck);
  }

  let clear = 1;

  function clearUser() {
    if (clear && db?.db) {
      const n = Date.now();
      db.db
        .prepare(
          `delete
                     from CmUser
                     where del = ?
                       and exp < ?`
        )
        .run(1, n);
      userCache.clear();
      clear = 0;
    }
  }

  setTimeout(clearUser, 1e4);
  setInterval(clearUser, 1e3 * 3600 * 12);
  const patchUserInfo = (a: Obj<Comment>) => {
    if (a.userId) {
      const u = getUser(a.userId) as CmUser;
      if (u) {
        a._avatar = u.avatar;
        a._name = u.name;
      }
    }
    if (a.reply) {
      const cm = db.get(model(Comment, { id: a.reply }));
      const u = cm && (getUser(cm.userId) as CmUser);
      if (u) {
        a._reply = u.name;
      }
    }
    return a;
  };
  const subCm = (ids: string, page: number, tk?: string, isAdm?: boolean) => {
    const userId = (tk && db.get(model(CmUser, { token: tk }))?.id) || 0;
    const id = ids
      .split(',')
      .map((a) => +a)
      .filter((a) => a);
    if (!id.length) return undefined;
    const ks = [
      'content',
      'createAt',
      'save',
      '_name',
      '_avatar',
      '_name',
      '_reply',
      'id',
      '_own',
      'isAdm'
    ] as (keyof Comment)[];

    const w = [`id in (${sqlFields(id.length)})`];
    if (!isAdm && sys.cmCheck) {
      w.push(`(userId=? or state=?)`);
      id.push(userId, cmStatus.Approve);
      ks.push('state');
    }
    return pageBuilder(
      page,
      5,
      Comment,
      ['createAt asc'],
      isAdm ? [] : ks,
      [w.join(' and '), ...id],
      (arr) => {
        return arr.map((a) => {
          fixOwn(userId, a, isAdm);
          return patchUserInfo(a);
        }) as Comment[];
      }
    );
  };

  return {
    clear() {
      userCache.clear();
      clearUser();
    },
    list: async (req: Request) => {
      const params = new URL(req.url).searchParams;
      const topic = +(params.get('topic') || 0);
      const status = +(params.get('status') || -1);
      const slug = params.get('slug') || '';
      const page = +(params.get('page') || 1);
      const p = slug && db.get(model(Post, { slug }));
      const isAdm = getClient(req)?.ok(permission.Admin);
      const canView = isAdm || getClient(req)?.ok(permission.Read);
      if (!topic && !p && !canView) return errMsg('post not exist', 1, 500);
      const where: string[] = [];
      const values: unknown[] = [];
      const tk = getTk(req);
      if (p) {
        where.push('postId=?');
        values.push(p.id);
      }
      const ks: (keyof Comment)[] = [];
      let uid = 0;
      if (slug) {
        if (tk) {
          const u = db.get(model(CmUser, { token: tk }));
          if (u && u.exp > Date.now()) uid = u.id;
        }
        where.push('topic is null');
        if (!isAdm) {
          values.push(cmStatus.Approve);
          if (sys.cmCheck && uid) {
            where.push('(state=? or (state=? and userid=?))');
            values.push(cmStatus.Pending, uid);
            ks.push('state');
          } else {
            where.push('state=?');
          }
          ks.push('id', '_avatar', '_own', 'isAdm', '_name', 'content', 'createAt', '_cms');
        }
      } else {
        if (topic) {
          const cm = db.get(model(Comment, { id: topic }));
          if (!cm) return errMsg('topic not exist', 1, 500);
          return subCm(cm.subCm || '', page, tk, isAdm);
        } else {
          // where.push("topic is null");
        }
        if (status !== -1) {
          if (!canView) return errMsg('no permission for filter', 0, 401);
          where.push(`state=?`);
          values.push(status);
        }
      }
      const w = where.length
        ? ([where.join(' and '), ...values] as [string, ...SQLQueryBindings[]])
        : undefined;
      return pageBuilder(page, slug ? 5 : 10, Comment, ['createAt desc'], ks, w, (arr) => {
        const postCache = new Map<number, { title: string; slug: string }>();
        arr.forEach((a) => {
          if (a.ip) a._geo = ipInfoStr(a.ip);
          if (slug && !topic && a.subCm) {
            a._cms = subCm(a.subCm, 1, tk, isAdm);
          }
          patchUserInfo(a);
          if (a.save === a.createAt) delete (a as Obj<Comment>).save;
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
          } else {
            fixOwn(uid, a, isAdm);
          }
        });
        return arr;
      });
    },
    del: async (req: Request) => {
      const now = Date.now();
      const isAdm = getClient(req)?.ok(permission.Admin);
      const tk = getTk(req);
      const ids = new Set(
        (await req.text())
          .replace(/^.*?\?/, '')
          .split(',')
          .map((a) => +a)
          .filter((a) => a)
      );
      const sz = ids.size;
      const topics = new Map<number, Set<number>>();
      if (!sz) return;
      if (!isAdm) {
        if (!tk || ids.size > 1) return errMsg('no permission');
        const id = [...ids][0];
        if (id) {
          const cm = db.get(model(Comment, { id }));
          if (!cm) return errMsg('comment not exist', 1);
          const usr = db.get(model(CmUser, { id: cm.userId }));
          if (!usr) {
            return errMsg('no permission');
          }
          if (usr.exp < now) return errMsg('token expire', 0, 401);
        }
      }
      const q = sqlFields(sz);
      const u0 = new Set(
        db.all(model(Comment), `id in (${q}) or topic in (${q})`, ...ids, ...ids).map((a) => {
          ids.add(a.id);
          if (ids.has(a.id) && a.topic) {
            const s = topics.get(a.topic) || new Set<number>();
            s.add(a.id);
            topics.set(a.topic, s);
          }
          return a.userId;
        })
      );
      db.delByPk(Comment, [...ids]);
      if (topics.size) {
        db.all(model(Comment), `id in (${sqlFields(topics.size)})`, ...topics.keys()).map((a) => {
          const s = new Set(
            a.subCm
              ?.split(',')
              .map((a) => +a)
              .filter((a) => a)
          );
          const o = topics.get(a.id);
          if (o)
            for (const id of o) {
              s.delete(id);
            }
          a.subCm = [...s].join();
          db.save(model(Comment, a));
        });
      }
      const u1 = new Set(
        db.all(model(Comment), `userId in (${sqlFields(u0.size)})`, ...u0).map((a) => a.userId)
      );
      for (const u of u1) {
        u0.delete(u);
      }
      if (u0.size) {
        clear = 1;
        db.db.prepare(`update CmUser set del=? where id in (${sqlFields(u0.size)})`).run(1, ...u0);
      }
    },
    get: (req: Request) => {
      const id = +req.url.replace(/.*?\?/, '');
      if (id) {
        const cm = db.get(model(Comment, { id }));
        if (cm) {
          const user = db.get(model(CmUser, { id: cm.userId })) as CmUser;
          cm._avatar = user.avatar;
          cm._name = user.name;
          return filter(cm, ['_avatar', '_name', 'content', 'createAt', 'save']);
        }
      }
      return resp('comment not exist', 500);
    },
    set: async (req: Request) => {
      const n = Date.now();
      const tk = getTk(req);
      const cm = model(Comment, await req.json());
      if (cm.content) cm.content = cm.content?.slice(0, 512);
      const user = model(CmUser, { token: tk }) as CmUser;
      const isAdm = getClient(req)?.ok(permission.Admin);
      // ensure cm permission
      if (!isAdm) {
        if (cm.isAdm) return errMsg('no permission', 1, 403);
        if (tk) {
          const gu = db.get(user) as CmUser;
          if (!gu || gu.exp < n) return errMsg('invalid cookie', 0, 403);
          Object.assign(user, gu, user);
        } else {
          if (cm.id) return errMsg('no permission', 1, 403);
          user.token = randomUUID();
        }
      }

      if (cm.id) {
        const c = db.get(model(Comment, { id: cm.id }));
        if (!c) return errMsg('comment not exist');
        else {
          if (!isAdm && cm.userId !== user.id) return errMsg('no permission', 1, 403);
          delete cm.isAdm;
          db.save(cm, { skipSave: isAdm });
          return {
            save: cm.save
          };
        }
      }

      let top: Comment | undefined;
      let rp: Comment | undefined;
      if (cm.topic) {
        top = db.get(model(Comment, { id: cm.topic }));
        if (!top) return errMsg('reply comment not exist!', 1, 500);
        if (!cm.reply) {
          rp = top;
          cm.reply = cm.topic;
        } else {
          rp = db.get(model(Comment, { id: cm.reply }));
          if (!rp) return errMsg('reply comment not exist!', 1);
        }
      }
      const fp = {} as Obj<Post>;
      if (rp) fp.id = rp.postId;
      if (cm._slug) fp.slug = cm._slug;
      const p = (fp.slug || fp.id) && db.get(model(Post, fp));
      if (!p || !p.published) return errMsg('post not exist', 1);
      if ((p.disCm || !sys.comment) && !isAdm) return errMsg('not allow comment', 0, 403);
      cm.postId = p.id;
      cm.state = cmStatus.Approve;
      if (!cm.isAdm) {
        if (sys.cmCheck && !isAdm) {
          cm.state = cmStatus.Pending;
        }
        if (cm._avatar) user.avatar = cm._avatar;
        let name = trim(cm._name || '');
        if (name) {
          if (name.toLocaleLowerCase() === 'admin') name = 'visitor';
          user.name = name;
        }
        user.exp = expire + n;
        user.del = -1;
        db.save(user);
        cm.userId = user.id;
        if (userCache.has(user.id)) {
          userCache.set(user.id, { name: user.name, avatar: user.avatar });
        }
      }
      cm.ip = getIp(req) || '';
      db.save(cm);
      const o = { id: cm.id } as Obj<Comment>;
      if (o.id) {
        if (top) {
          top.subCm = (top.subCm || '')
            .split(',')
            .map((a) => +a)
            .filter((a) => a)
            .concat(o.id)
            .join();
          db.save(model(Comment, top));
        }
        o.save = cm.save;
      } else {
        o.createAt = cm.createAt;
        o.id = cm.id;
      }
      if (sys.cmCheck) o.state = cm.state;
      const rsp = resp(o);
      if (!cm.isAdm && user.token) setCookie(rsp, ck, user.token, user.exp || expDay(2));
      return rsp;
    }
  };
})();

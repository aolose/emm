import type {APIRoutes, curPost, Obj} from '../types';
import {db, server, sys} from './index';
import {genPubKey} from './crypto';
import {
    checkStatue,
    combineResult, DBProxy,
    getReqJson,
    getTokens,
    md5,
    mkdir,
    model,
    pageBuilder,
    resp,
    saveFile, setTokens, skipLogin,
    sysStatue,
    uniqSlug, val
} from './utils';
import type {RespHandle} from '$lib/types';
import sharp from 'sharp';
import {Buffer} from "buffer";
import {FwLog, FWRule, Post, Res, Tag} from "$lib/server/model";
import {diffObj, enc, filter} from "$lib/utils";
import {NULL, permission, token_statue} from "$lib/server/enum";
import {tagPatcher} from "$lib/server/cache";
import path from "path";
import fs from "fs";
import {genToken, getPermissions} from "$lib/server/token";
import {addRule, blockIp, delRule, filterLog, fw2log, logCache} from "$lib/server/firewall";
import {loadGeoDb} from "$lib/server/ipLite";
import {publishedPost, tags} from "$lib/store";
import {get} from "svelte/store";

const auth = (ps: permission | permission[], fn: RespHandle) => (req: Request) => {
    if (!sysStatue) return resp('system uninitialized', 403)
    const requires = new Set(([] as permission[]).concat(ps))
    const tokens = getTokens(req)
    const pms = getPermissions(tokens)
    if (skipLogin) requires.delete(Admin)
    for (const p of requires) {
        const s = pms.get(p)
        let err = ''
        if (s === undefined) err = 'invalid token'
        else switch (s) {
            case token_statue.expire:
                err = 'token expire'
                break
            case token_statue.unknown:
                err = 'unknown token'
        }
        if (err) return resp(err, 403)
    }
    return fn(req, pms);
};

// todo: link flag to session
// need a clientMap
let curPostFlag = [0, 0]
const {Admin} = permission
const apis: APIRoutes = {
    log: {
        async post(req) {
            const t = (await req.json()) as FWRule & { type: number, page: number, size: number, t: number }
            const lgs = t.type ? db.all(model(FwLog)).map(fw2log) : logCache
            const total = Math.floor((lgs.length + t.size - 1) / t.size)
            const d = filterLog(lgs, t).slice((t.page - 1) * t.size, t.page * t.size).filter(a => t.t ? a[0] > t.t : 1)
            if (t) {
                return {total, data: d}
            }
        }
    },
    rule: {
        post: auth(Admin, async req => {
            const r = model(FWRule, await req.json())
            addRule(r as FWRule)
            return r.id
        })
    },
    rules: {
        delete: auth(Admin, async req => {
            const ids = (await req.text()).split(',').filter(a => a).map(v => +v)
            delRule(ids)
            return
        }),
        post: auth(Admin, async (req) => {
            const r = new Uint8Array(await req.arrayBuffer())
            const p = r[0]
            const s = r[1]
            return pageBuilder(p, s, FWRule,
                ['createAt desc'],
                ['id', 'path', 'headers', 'ip', 'mark',
                    'country', 'log', 'active', 'noAccess']
            )
        })
    },
    login: {
        post: async (req) => {
            if (sysStatue < 2) return resp(-1, 403)
            const tryTimes = 3
            const base = 1e4
            const ip = req.headers.get('x-forwarded-for') || ''
            console.log(ip)
            const [q, sv] = blockIp('lg', ip)
            if (q[1]) {
                sv()
                return resp(q[1], 403)
            }
            const [u, p, v] = await getReqJson(req)
            if (await enc(sys.admUsr + v) === u && await enc(sys.admPwd + v) === p) {
                const res = resp('')
                setTokens(res, [genToken(Admin)])
                q[0] = 0
                sv()
                return res
            } else {
                q[0]++
                q[1] = Math.floor(Math.pow(2, q[0] - tryTimes)) * base
                sv()
                return resp(q[1], 403)
            }
        }
    },
    dbPath: {
        post: async (req) => {
            if (sysStatue) return resp('', 403)
            const p = await req.text()
            if (!p) return 'empty path'
            const pa = path.resolve(p)
            const dir = path.dirname(pa)
            try {
                const ex = fs.existsSync(dir)
                if (!ex) {
                    fs.mkdirSync(dir, {recursive: true})
                }
                const err = server.start(p)
                if (err) return err
                else {
                    fs.writeFileSync('.dbCfg', p)
                    checkStatue()
                }
            } catch (e) {
                return resp(e?.toString(), 500)
            }
        }
    },
    tagLS: {
        post: auth(Admin, async req => {
            return get(tags)
        })
    },
    tag: {
        post: auth(Admin, async req => {
            const ts = get(tags)
            const tag = await req.json() as Tag
            if (tag.name) {
                const t = ts.find(a => a.name === tag.name)
                if (t) {
                    Object.assign(t, filter(tag, ['banner', 'desc'], false))
                } else ts.unshift(DBProxy(Tag, tag))
                tags.set([...ts])
            }
        }),
        delete: auth(Admin, async req => {
            const name = await req.text()
            const t = get(tags).find(t => t.name === name)
            if (t) {
                const ids = (val(t.post) as string || '').split(',')
                if (ids.length) {
                    const e = new Array(ids.length).fill('?').join(',')
                    const p = db.all(model(Post), `id in (${e})`, ...ids)
                    p.forEach(a => {
                        const ts = new Set(a.tag?.split(','))
                        ts.delete(name)
                        const t = ts.size ? [...ts].join() : null
                        db.db.prepare('update post set tag=? where id=?').run(t, a.id)
                    })
                }
                db.delByPk(Tag, ids)
                tags.update(tt => tt.filter(a => a.name && a.name !== name))
            }
        }),
    },
    tags: {
        get: async () => {
            const ps = get(publishedPost)
            console.log('ps', ps)
            const ts = get(tags).filter(a => {
                const p = (a.post || '').split(',').filter(a => ps.has(+a))
                if (p.length) {
                    return true
                }
            })
            return ts.map(a => a.name).join()
        },
        post: auth(Admin, async req => {
            const ver = +(await req.text())
            const r = tagPatcher(ver)
            let d = r[0] + ''
            if (r.length === 2) {
                d = [d, [...r[1]].join()].join(' ')
            } else d = [d, r[1] ? [...r[1]].join() : '', r[2] ? [...r[2]].join() : ''].join(' ')
            return d
        })
    },
    posts: {
        get: auth([], async req => {
            // todo pms
            const params = new URL(req.url).searchParams
            const page = +(params.get('page') || 1)
            const size = +(params.get('size') || 10)
            const tag = params.get('tag')
            let where: [string, ...unknown[]] = ['published=? ', 1]
            if (tag) {
                const tg = get(tags).find(a => a.name === tag)
                const ps = (tg?.post?.split(',') || [])
                if (ps.length) {
                    where = [`${where[0]} and id in (${ps.map(() => '?').join()})`, 1, ...ps]
                }
            }
            return pageBuilder(page, size, Post,
                ['createAt desc'], [
                    'banner', 'desc',
                    'content', 'createAt',
                    'tag', 'title', 'slug'
                ],
                where
            )
        }),
        post: auth(Admin, async (req, pms) => {
            const {
                page, size
            } = await req.json()
            return pageBuilder(page, size, Post,
                ['createAt desc'], undefined,
            )
        })
    },
    slug: {
        post: auth(Admin, async req => {
            const s = await req.text()
            const mt = s.match(/(\d*?),(.*)/)
            if (mt) {
                const [id, slug] = mt.slice(1)
                return uniqSlug(+id, slug)
            }
        })
    },
    comment: {
        post: () => {
            return ''
        }
    },
    comments: {
        get: () => {
            return []
        }
    },
    post: {
        get: auth([], async (req, pms) => {
            const slug = req.url.replace(/.*?\?/, '')
            if (slug) {
                const p = db.get(model(Post, {slug}))
                // todo pms check
                if (p) {
                    return filter(p, [
                        'banner', 'comment', 'desc',
                        'content', 'createAt',
                        'tag', 'title'
                    ], false)
                }
            }
            return resp('post not found', 404)
        }),
        delete: auth(Admin, async (req) => {
            const i = new Uint8Array(await req.arrayBuffer())
            return db.delByPk(Post, [...i]).changes
        }),
        post: auth(Admin, async (req) => {
            const [flag, id] = curPostFlag
            const o = model(Post, await getReqJson(req)) as curPost
            if (!o.id) {
                if (flag === o._) {
                    o.id = id
                } else o.id = NULL.INT
            }
            const d = model(Post, o) as { id: number }
            db.save(d)
            if (o._) curPostFlag = [o._, d.id]
            return filter(diffObj(o as Post, d) as Obj<Post>, [], false)
        })
    },
    res: {
        delete: auth(Admin, async (req) => {
            const r = new Uint8Array(await req.arrayBuffer())
            const {changes} = db.delByPk(Res, [...r])
            return changes
        }),
        post: auth(Admin, async (req) => {
            let where:[string, ...unknown[]]|undefined
            let type = req.headers.get('filetype')
            if (type) {
                type = type.replace(/\*/g, '%')
                where=['type like ?', type]
            }
            const r = new Uint8Array(await req.arrayBuffer())
            const p = r[0]
            const s = r[1]
            return pageBuilder(p, s, Res,
                ['save desc'],
                ['id', 'name', 'size', 'type', 'thumb'],
                where
            )
        })
    },
    up: {
        post: auth(Admin, async (req) => {
            const d = await req.formData();
            const f = d.get('file') as Blob;
            const n = d.get('name') as string;
            const buf = Buffer.from(await f.arrayBuffer())
            const res = new Res()
            res.md5 = md5(buf)
            const r = db.get(res)
            if (r) return r.id
            res.size = buf.length
            res.name = n
            res.type = f.type
            db.save(res)
            try {
                saveFile(res.id, sys.uploadDir, buf)
                if (f.type.startsWith('image/')) {
                    try {
                        const img = sharp(buf)
                        const meta = await img.metadata()
                        const w = meta.width || 0
                        if (w > 300) {
                            const thumb = await img.resize(300).toBuffer()
                            saveFile(res.id, sys.thumbDir, thumb)
                            res.thumb = 1
                            db.save(res)
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
            } catch (e) {
                console.error(e)
                db.del(res)
            }
            return res.id
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
            if (!sys || (sys.admUsr && sys.admPwd)) return resp('', 403)
            const d = await getReqJson(req);
            const {usr, pwd} = d
            if (usr && pwd) {
                sys.admUsr = await enc(usr);
                sys.admPwd = await enc(pwd);
                const res = resp('')
                checkStatue()
                setTokens(res, [genToken(Admin)])
                return res;
            } else {
                return resp('username or password is empty', 500)
            }
        }
    },
    setUp: {
        // todo auth need
        post: auth(Admin, async (req) => {
            const p = await req.text()
            if (!p) return resp('invalid directory', 500)
            const [a, b] = p.split(',')
            if (!a || !b || a === b) return resp('invalid directory', 500)
            let err = mkdir(a)
            if (!err) err = mkdir(b)
            if (!err) {
                sys.uploadDir = a
                sys.thumbDir = b
            }
            checkStatue()
            return resp(err, err ? 500 : 200)
        })
    },
    setGeo: {
        post: auth(Admin, async req => {
            const p = await req.text()
            if (!p) {
                sys.ipLiteToken = ''
            } else {
                const [tk, ph] = p.split(',')
                if (tk) sys.ipLiteToken = tk
                if (ph) sys.ipLiteDir = ph
                checkStatue()
                loadGeoDb()
            }
            return ''

        })
    },
    test: {
        get() {
            return {
                test: 1
            };
        }
    }
}

export const apiPath = Object.keys(apis)
export default apis

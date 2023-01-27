import type {APIRoutes, curPost, Obj, TokenInfo} from '../types';
import {db, server, sys} from './index';
import {genPubKey} from './crypto';
import {
    checkStatue,
    combineResult,
    DBProxy,
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
    skipLogin,
    sysStatue,
    uniqSlug,
    val
} from './utils';
import type {RespHandle} from '$lib/types';
import sharp from 'sharp';
import {Buffer} from "buffer";
import {FwLog, FWRule, Post, Require, Res, Tag} from "$lib/server/model";
import {diffObj, enc, filter, sort} from "$lib/utils";
import {NULL, permission} from "$lib/server/enum";
import path from "path";
import fs from "fs";
import {genToken} from "$lib/server/token";
import {addRule, blockIp, delRule, filterLog, fw2log, logCache} from "$lib/server/firewall";
import {loadGeoDb} from "$lib/server/ipLite";
import {codePatcher, publishedPost, tagPatcher, tags} from "$lib/server/store";
import {get} from "svelte/store";
import {codeTokens} from "$lib/server/cache";
import {versionStrPatch} from "$lib/setStrPatchFn";

const auth = (ps: permission | permission[], fn: RespHandle) => (req: Request) => {
    if (!sysStatue) return resp('system uninitialized', 403)
    if (!skipLogin) {
        const requires = new Set(([] as permission[]).concat(ps))
        const client = getClient(req)
        if (requires.size) {
            if (!client) return resp('empty token', 403)
            if (!client.ok(Full)) {
                for (const p of requires) {
                    const s = client.ok(p)
                    if (s) continue
                    else return resp('invalid token', 403)
                }
            }
        }
    }
    return fn(req);
};

// todo: link flag to session
// need a clientMap
let curPostFlag = [0, 0]
const {Full, Read} = permission
const apis: APIRoutes = {
    logout: {
        get: () => {
            const res = resp('')
            delCookie(res, 'token')
            return res
        }
    },
    statue: {
        get: (req) => {
            let s = 0
            if (skipLogin) s = 1
            else {
                const c = getClient(req)
                if (c) {
                    if (c.ok(permission.Full) || c.ok(permission.Read)) s = 1
                }
            }
            return `${s}${sys.codeLogin}`
        }
    },
    code: {
        delete: auth(Full, async req => {
            const code = await req.text()
            if (code) return +codeTokens.delete(code)
        }),
        get: auth(Full, (req) => {
            const ver = +(req.url.replace(/.?\?/, '') || 0)
            const r = codePatcher(ver)
            const re = {version:r[0]} as {data?:TokenInfo[],patch?:string}
            const d = r[1]
            const e = r[2]
            if(d&&d.size){
                re.data = [...d].map(a=>codeTokens.get(a) as TokenInfo)
            }
            if(r.length===3)re.patch = e?.size?[...e].join():''
            return re
        }),
        post: async (req) => {
            const code = await req.text()
            const tk = codeTokens.get(code)
            if (tk) {
                const client = getClient(req)
                if (client?.has(tk)) return ''

                const n = Date.now()
                const {expire = 0, times = 0} = tk
                if (expire < 0 || expire > n) {
                    tk.times = times - 1
                    if (times === 1) codeTokens.delete(code)
                    if (times) {
                        const re = resp(tk.type)
                        setToken(req, re, tk)
                        return re
                    }
                }
                codeTokens.delete(code)
            }
            return resp('invalid code', 403)
        }
    },
    require: {
        post: auth(Full, async (req) => {
            const token = model(Require, await req.json())
            db.save(token)
            return token.id
        }),
        get: auth(Read, async (req) => {
            const params = new URL(req.url).searchParams
            const page = +(params.get('page') || 1)
            const name = params.get('name')
            const type = params.get('type')
            const where: string[] = []
            const pm: unknown[] = []
            if (name) {
                where.push('name like ?')
                pm.push(`%${name}%`)
            }
            if (type !== null) {
                where.push('type = ?')
                pm.push(+type)
            }
            const wh = where.length ?
                [where.join(' and '), ...pm] as [string, ...unknown[]] : undefined
            return pageBuilder(page, 10, Require,
                ['createAt desc'], [], wh
            )
        })
    },
    log: {
        post: auth(Read, async (req) => {
            const t = (await req.json()) as FWRule & { type: number, page: number, size: number, t: number }
            const lgs = t.type ? db.all(model(FwLog)).map(fw2log) : logCache
            const total = Math.floor((lgs.length + t.size - 1) / t.size)
            const d = filterLog(lgs, t).slice((t.page - 1) * t.size, t.page * t.size).filter(a => t.t ? a[0] > t.t : 1)
            if (t) {
                return {total, data: d}
            }
        })
    },
    rule: {
        post: auth(Full, async req => {
            const r = model(FWRule, await req.json())
            addRule(r as FWRule)
            return r.id
        })
    },
    rules: {
        delete: auth(Full, async req => {
            const ids = (await req.text()).split(',').filter(a => a).map(v => +v)
            delRule(ids)
            return
        }),
        post: auth(Read, async (req) => {
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
                setToken(req, res, genToken(Full))
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
        post: auth(Read, async req => {
            return get(tags)
        })
    },
    tag: {
        post: auth(Full, async req => {
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
        delete: auth(Full, async req => {
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
        post: auth(Read, async req => {
            const ver = +(await req.text())
            const r = tagPatcher(ver)
            return versionStrPatch(r)
        })
    },
    posts: {
        get: async req => {
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
        },
        post: auth(Read, async (req) => {
            const {
                page, size
            } = await req.json()
            return pageBuilder(page, size, Post,
                ['createAt desc'], undefined,
            )
        })
    },
    slug: {
        post: auth(Full, async req => {
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
        get: async (req) => {
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
        },
        delete: auth(Full, async (req) => {
            const i = new Uint8Array(await req.arrayBuffer())
            return db.delByPk(Post, [...i]).changes
        }),
        post: auth(Full, async (req) => {
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
        delete: auth(Full, async (req) => {
            const r = new Uint8Array(await req.arrayBuffer())
            const {changes} = db.delByPk(Res, [...r])
            return changes
        }),
        post: auth(Read, async (req) => {
            let where: [string, ...unknown[]] | undefined
            let type = req.headers.get('filetype')
            if (type) {
                type = type.replace(/\*/g, '%')
                where = ['type like ?', type]
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
        post: auth(Full, async (req) => {
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
                setToken(req, res, genToken(Full))
                return res;
            } else {
                return resp('username or password is empty', 500)
            }
        }
    },
    setUp: {
        // todo auth need
        post: auth(Full, async (req) => {
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
        post: auth(Full, async req => {
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
    }
}

export const apiPath = Object.keys(apis)
export default apis

import type {APIRoutes, curPost, Obj} from '../types';
import {db, server, sys} from './index';
import {genPubKey} from './crypto';
import {
    getReqJson,
    combineResult,
    model,
    md5,
    saveFile,
    pageBuilder,
    uniqSlug,
    sysStatue,
    resp, checkStatue, mkdir
} from './utils';
import type {RespHandle} from '$lib/types';
import sharp from 'sharp';
import {Buffer} from "buffer";
import {Post, Res} from "$lib/server/model";
import {diffObj, filter} from "$lib/utils";
import {NULL} from "$lib/server/enum";
import {tagPatcher} from "$lib/server/cache";
import path from "path";
import fs from "fs";

const auth = (fn: RespHandle, fail?: RespHandle) => (req: Request) => {
    if (!sysStatue) return resp('system uninitialized', 403)
    console.log('auth...', fail);
    return fn(req);
};

// todo: link flag to session
// need a clientMap
let curPostFlag = [0, 0]

const apis: APIRoutes = {
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
                    fs.writeFileSync('.config.db', p)
                    checkStatue()
                }
            } catch (e) {
                return e?.toString()
            }
        }
    },
    tags: {
        post: auth(async req => {
            const ver = +(await req.text()) || undefined
            const [v, a, d] = tagPatcher(ver)
            return
        })
    },
    posts: {
        post: auth((req) => {
            return pageBuilder(req, Post,
                ['createAt desc']
            )
        })
    },
    slug: {
        post: auth(async req => {
            const s = await req.text()
            const mt = s.match(/(\d*?),(.*)/)
            if (mt) {
                const [id, slug] = mt.slice(1)
                return uniqSlug(+id, slug)
            }
        })
    },
    post: {
        delete: auth(async (req) => {
            const i = new Uint8Array(await req.arrayBuffer())
            return db.delByPk(Post, [...i]).changes
        }),
        post: auth(async (req) => {
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
        delete: auth(async (req) => {
            const r = new Uint8Array(await req.arrayBuffer())
            const {changes} = db.delByPk(Res, [...r])
            return changes
        }),
        post: auth(async (req) => {
            return pageBuilder(req, Res,
                ['save desc'],
                ['id', 'name', 'size', 'type', 'thumb']
            )
        })
    },
    up: {
        post: auth(async (req) => {
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
                sys.admUsr = md5(usr);
                sys.admPwd = md5(pwd);
                checkStatue()
                return '';
            } else {
                return resp('username or password is empty', 500)
            }
        }
    },
    setUp: {
        // todo auth need
        post: async (req) => {
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
        }
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

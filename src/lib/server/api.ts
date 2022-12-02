import type {APIRoutes, curPost} from '../types';
import {db, sys} from './index';
import {genPubKey} from './crypto';
import {getReqJson, combineResult, model, md5, saveFile, pageBuilder} from './utils';
import type {RespHandle} from '$lib/types';
import sharp from 'sharp';
import {Buffer} from "buffer";
import {Post, Res} from "$lib/server/model";
import {diffObj} from "$lib/utils";
import {NULL} from "$lib/server/enum";

const auth = (fn: RespHandle, fail?: RespHandle) => (req: Request) => {
    console.log('auth...', fail);
    return fn(req);
};

// todo: link flag to session
// need a clientMap
let curPostFlag = [0, 0]

const apis: APIRoutes = {
    initialized: {
        get() {
            return +!!sys.admUsr;
        }
    },
    posts: {
        post: auth((req) => {
            return pageBuilder(req, Post,
                ['save desc']
            )
        })
    },
    post: {
        post: auth(async (req) => {
            const [flag, id] = curPostFlag
            const o =  model(Post,await getReqJson(req)) as curPost
            o.save = NULL.DATE
            if (!o.id) {
                if (flag === o._) {
                    o.id = id
                } else o.id = NULL.INT
            }
            const d = model(Post, o) as { id: number }
            db.save(d)
            if (o._) curPostFlag = [o._, d.id]
            return diffObj(o as Post, d)
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
        async post(req) {
            const d = await getReqJson(req);
            sys.admUsr = d['usr'];
            sys.admPwd = d['pwd'];
            return sys;
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

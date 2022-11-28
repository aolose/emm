import type {Api} from '../types';
import {db, sys} from './index';
import {genPubKey} from './crypto';
import {getReqJson, combineResult, cacheCount} from './utils';
import type {RespHandle} from '$lib/types';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {Buffer} from "buffer";
import {Res} from "$lib/server/model";
import crypto from 'crypto'
import {arrPick} from "$lib/utils";

const auth = (fn: RespHandle) => (req: Request) => {
    console.log('auth...');
    return fn(req);
};

export const initialized: Api = {
    get() {
        return +!!sys.admUsr;
    }
};

const md5 = (buf: Buffer) => {
    const hashSum = crypto.createHash('md5');
    hashSum.update(buf);
    return hashSum.digest('hex');
}

const saveFile = (name: string | number, dir: string, buf: Buffer) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true})
    }
    const p = path.resolve(dir, name + '')
    fs.writeFileSync(p, buf, {flag: 'w'});
}


export const res: Api = {
    post: auth(async (req) => {
        const r = new Uint8Array(await req.arrayBuffer())
        const p = r[0]
        const s = r[1]
        const c = cacheCount(Res) as number
        console.log(c,)
        return {
            total: Math.floor((c + s - 1) / s),
            items: arrPick(
                db.page(Res, p, s, ['save desc'])
                ,'id','name','size','type','thumb'
            )
        }
    })
}

export const up: Api = {
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
    })
};

export const hello: Api = {
    async post(request) {
        const buf = await request.arrayBuffer();
        const [id, pk] = await genPubKey(buf);
        return combineResult(id, pk);
    }
};

export const setAdmin: Api = {
    async post(req) {
        const d = await getReqJson(req);
        sys.admUsr = d['usr'];
        sys.admPwd = d['pwd'];
        return sys;
    }
};

export const test: Api = {
    get() {
        return {
            test: 1
        };
    }
};

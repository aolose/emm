import type {RequestHandler} from "@sveltejs/kit";
import fs from 'fs'
import {resp} from "$lib/server/utils";
import path from "path";
import etag from 'etag'
import {sys, db} from "$lib/server";
import {Res} from "$lib/server/model";

export const GET: RequestHandler = ({params}) => {
    const res = new Res()
    let p = params.res
    let isThumb = false
    if (p) {
        if (p.startsWith('_')) {
            p = p.slice(1)
            isThumb = true
        }
        res.id = +p
        const r = db.get(res)
        if (r) {
            let f: Buffer | undefined
            const u = path.resolve(sys.uploadDir, p)
            const t = path.resolve(sys.thumbDir, p)
            if (isThumb) {
                if (fs.existsSync(t)) f = fs.readFileSync(t)
            }
            if (!f) {
                if (fs.existsSync(u)) f = fs.readFileSync(u)
            }
            const desc = 'content-disposition'

            if (f) {
                const h = new Headers({
                    'ETag': etag(f)
                })
                if (!/image|text|video/i.test(r.type || '')) {
                    h.set(desc, `attachment; filename=${r.name}`)
                }
                return new Response(f, {
                    headers: h
                })
            }
        }
    }
    return resp('Resources not exist!', 404)
}
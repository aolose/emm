import type {Api} from "./types";
import {sys} from "./index";
import {genPubKey} from "./crypto";
import {combineResult, errorResp, getResJson} from "../utils";
import {val} from "./utils";


export const hello: Api = {
    async post(request) {
        const buf = await request.arrayBuffer()
        const [id, pk] = await genPubKey(buf)
        return new Response(combineResult(id, pk))
    }
}

export const setAdmin: Api = {
    async post(req) {
        if (!val(sys.admUsr)) {
            const r = getResJson(req)
            return new Response(JSON.stringify(r))
        } else {
            return errorResp(403, 'admin already exist!')
        }
    }
}


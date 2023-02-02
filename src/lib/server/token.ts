import {randNum, randStr} from "$lib/utils";
import {codeTokens} from "$lib/server/cache";
import type {permission} from "$lib/enum";
import type { TokenInfo } from "$lib/server/model";
import type { Obj } from "$lib/types";


const h = 1e3 * 60
const expires = [
    h * 24, // admin
    h * 24 * 30, // post
]

export const genToken = (type: permission, cfg: {
    code?: boolean,
    times?: number,
    expires?: number,
    _reqs?: Set<number>
} = {}) => {
    const now = Date.now()
    const token: Obj<TokenInfo> = {
        createAt: now,
        expire: cfg.expires || now + expires[type],
        type,
        _reqs:cfg._reqs
    }
    if (cfg.code) {
        const cd = randStr(randNum(1e4).toString(32))
        codeTokens.set(cd, token)
    }
    return token as TokenInfo
}
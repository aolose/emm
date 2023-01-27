import type {TokenInfo} from "$lib/types";
import {randNum, randStr} from "$lib/utils";
import {codeTokens} from "$lib/server/cache";
import type {permission} from "$lib/server/enum";


const h = 1e3 * 60
const expires = [
    h * 24, // admin
    h * 24 * 30, // post
]

export const genToken = (type: permission, cfg: {
    code?: boolean,
    times?: number,
    expires?: number,
    reqs?: Set<number>
} = {}) => {
    const now = Date.now()
    const token: TokenInfo = {
        createAt: now,
        expire: cfg.expires || now + expires[type],
        type
    }
    if (cfg.code) {
        const cd = randStr(randNum(1e4).toString(32))
        codeTokens.set(cd, token)
    }
    return token
}
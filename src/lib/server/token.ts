import type {TokenInfo} from "$lib/types";
import {randNum, randStr} from "$lib/utils";
import {codeTokens} from "$lib/server/cache";
import type {permission} from "$lib/server/enum";


const h = 1e3 * 60
const expires = [
    h * 24, // admin
    h * 24 * 30, // post
]

export const genToken = (type: permission, times?: number) => {
    const now = Date.now()
    const token: TokenInfo = {expire: now + expires[type], type}
    if (times) {
        token.times = times
        const code = randStr(randNum(1e4).toString(32))
        codeTokens.set(code, token)
    }
    return token
}
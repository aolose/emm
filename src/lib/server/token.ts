import {randomUUID} from "crypto";
import {permission, token_statue} from "$lib/server/enum";
import type {Permissions} from "$lib/types";

type expire = number
type refKey = number | string
type TokenInfo = [expire, permission, refKey]

export const tkCache = new Map<string, TokenInfo>()

const findTokens = (type: permission) => {
    const ts = []
    const n = Date.now()
    for (const [k, v] of tkCache) {
        if (v[0] < n) tkCache.delete(k)
        else if (v[1] === type) {
            ts.push(k)
        }
    }
    return ts
}

// clean token 1min loop
setInterval(() => {
    const now = Date.now()
    for (const [k, v] of tkCache) {
        if (v[0] < now) tkCache.delete(k)
    }
}, 6e4)


export const getPermissions = (tokens: string[]) => {
    const pms = new Map<permission, token_statue>()
    for (const tk of tokens) {
        let s = token_statue.unknown
        const inf = tkCache.get(tk)
        if (inf) {
            const now = Date.now()
            const [expire, type, refKey] = inf
            if (expire < now) {
                tkCache.delete(tk)
                s = token_statue.expire
            }
            switch (type) {
                case permission.Admin:
                    if (refKey === 'admin') s = token_statue.ok
                    break;
            }
            pms.set(type,s)
        }
    }
    return pms
}

const h = 1e3 * 60
const expires = [
    h * 24, // admin
]

export const genToken = (type: permission) => {
    const tk = randomUUID()
    const now = Date.now()
    const expire = now + expires[type]
    const data: TokenInfo = [expire, type, '']
    switch (type) {
        case permission.Admin:
            findTokens(permission.Admin).forEach(k => tkCache.delete(k))
            data[2] = 'admin'
            break;
        case permission.Article:
            break;
        case permission.Comment:
            break;
        default:
            return ''
    }
    tkCache.set(tk, data)
    return tk
}
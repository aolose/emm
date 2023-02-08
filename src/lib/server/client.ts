import {randomUUID} from "crypto";
import {clientMap} from "$lib/server/cache";
import {permission} from "$lib/enum";
import type { TokenInfo } from "$lib/server/model";
import type { Obj } from "$lib/types";

export class Client {
    constructor() {
        this.tokens = new Map()
        clientMap.set(
            this.uuid = randomUUID(),
            this
        )
    }

    disable = false
    uuid = ''
    tokens: Map<permission, Map<number, number> | number>

    has(tk: {type:permission,_reqs?:number[]}|Obj<TokenInfo>) {
        this.clear()
        const {type, _reqs} = tk
        if(type===undefined)return false
        const t = this.tokens.get(type)
        if (t) {
            if (type === permission.Admin) {
                return true
            }
            if (_reqs) {
                for (const r of _reqs) {
                    const v = (t as Map<number, number>).get(r)
                    if (v !== r) {
                        if (r === -1 || !v || v < r) return false
                    }
                }
                return true
            }
        }
        return false
    }

    addToken(tk: TokenInfo) {
        this.clear()
        const {expire, _reqs, type} = tk
        if (type === permission.Admin) {
            for (const cli of clientMap.values()) {
                cli.rmPermission(type)
            }
            this.tokens.set(type, expire)
        } else {
            let ct = this.tokens.get(tk.type)
            if (!ct && _reqs?.size) {
                this.tokens.set(type, ct = new Map())
                for (const c of _reqs) {
                    const e = ct.get(c) || 0
                    if (e !== -1) ct.set(c, Math.max(expire, e))
                }
            }
        }
    }

    rmPermission(p: permission) {
        this.tokens.delete(p)
    }

    ok(p: permission) {
        this.clear()
        const ct = this.tokens.get(p)
        if (!ct) return false
        return true
    }

    clear() {
        const n = Date.now()
        let keep = 0
        for (const [k, v] of this.tokens) {
            if (k === permission.Admin) {
                if (v > -1 && v < n) this.tokens.delete(permission.Admin)
                else keep = 1
            } else {
                const m = v as Map<number, number>
                for (const [a, b] of m) {
                    if (b !== -1 && b < n) m.delete(a)
                    else keep = 1
                }
                if (!m.size) this.tokens.delete(k)
            }
        }
        return keep
    }
}
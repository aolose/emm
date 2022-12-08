import type {Writable} from "svelte/store";
import type {DiffFn, PatchFn, PatchPool, version} from "$lib/types";

export function Patcher<T extends object>(patch: PatchFn<T>, diff: DiffFn<T>, store: Writable<T>, expire = 1e5 * 36 * 24) {
    let version = 0
    let latest = 0
    const patchPool: PatchPool<T> = new Map()

    let curData: T
    store.subscribe(cur => {
        if (curData === undefined) {
            curData = cur
            return
        }
        const now = Date.now()
        for (const [v, p] of patchPool) {
            if (p.size === 0 || p.expire < now) patchPool.delete(v)
            const old = patch(curData, p.del, p.add)
            const pt = diff(old, cur)
            Object.assign(p, pt)
        }
        if (latest === version) version++
    })

    return (ver: version = version) => {
        latest = version
        const exp = Date.now() + expire
        let d = patchPool.get(ver)
        if (!d) {
            patchPool.set(version, {
                expire: exp,
                size: 1
            })
            return [version, curData]
        } else {
            const r = [version, d.add, d.del]
            d.size--
            if (!d.size) patchPool.delete(ver)
            if (ver !== version) d = patchPool.get(version)
            if (d) {
                d.size++
                d.expire = exp
            }
            return r
        }
    }
}
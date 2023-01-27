import type {Readable} from "svelte/store";
import type {DiffFn, PatchFn, PatchPool, version} from "$lib/types";
import {patchStrSet} from "$lib/setStrPatchFn";

export function Patcher<T extends object>(
    patch: PatchFn<T>,
    diff: DiffFn<T>,
    store: Readable<T>, expire = 1e5 * 36 * 24) {
    let version = 1
    let latest = 0
    const patchPool: PatchPool<T> = new Map()

    let curData: T
    store.subscribe(cur => {
        if (curData === undefined) {
            curData = cur
            return
        }
        if (curData !== cur) {
            const now = Date.now()
            for (const [v, p] of patchPool) {
                if (p.size === 0 || p.expire < now) {
                    patchPool.delete(v)
                    continue
                }
                const old = patch(curData, p.del, p.add)
                const pt = diff(old, cur)
                Object.assign(p, pt)
            }
            if (latest === version) version++
            curData = cur
        }
    })

    return (ver: version) => {
        if (!ver) ver = version
        latest = version
        const exp = Date.now() + expire
        let d = patchPool.get(ver)
        if (!d) {
            patchPool.set(version, {
                expire: exp,
                size: 1
            })
            return [version, curData] as [number, T]
        } else {
            const r = [version, d.add, d.del] as [number, T | undefined, T | undefined]
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
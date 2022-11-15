import type {Model} from "./types";

type Record = [number, Model | Model[] | undefined, Promise<Model | Model[]> | undefined]
const modelCacheMap = new Map<string, Record>()

export async function modelCache(fn: () => Promise<Model | Model[]>, cacheTime?: number, key?: string) {
    if (!key || !cacheTime) return fn();
    const rec = modelCacheMap.get(key)
    if (rec) {
        const [time, result, promise] = rec
        if (promise) return promise
        if (time > Date.now() + cacheTime) return result
    }
    const rec1: Record = [
        0, undefined, new Promise(resolve => {
            fn().then(r => {
                rec1[0] = Date.now() + cacheTime
                rec1[1] = r
                rec1[2] = undefined
                resolve(r)
            })
        })
    ]
    modelCacheMap.set(key, rec1)
}
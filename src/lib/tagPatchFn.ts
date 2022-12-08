import type {DiffFn, PatchFn} from "$lib/types";


export const diffTags: DiffFn<Set<string>> = (old, cur) => {
    const add = new Set<string>()
    const del = new Set<string>()
    for (const o of cur) if (!old.has(o)) add.add(o)
    for (const o of old) if (!cur.has(o)) del.add(o)
    return {add, del}
}

export const patchTags: PatchFn<Set<string>> = (data, add, del) => {
    const d = new Set(data)
    if (del) for (const s of del) d.delete(s)
    if (add) for (const s of add) d.add(s)
    return d
}
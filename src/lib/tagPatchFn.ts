import type {DiffFn, PatchFn} from "$lib/types";
import type {Tag} from "$lib/server/model";

const has = <T extends string | Tag>(set: Set<T>, tag: T) => {
    if (typeof tag === 'string') {
        return set.has(tag)
    } else {
        return !!([...set] as Tag[]).find((a) => a.name === tag.name)
    }
}
export const diffTags: DiffFn<Set<string | Tag>> = (old, cur) => {
    const add = new Set<string | Tag>()
    const del = new Set<string | Tag>()
    for (const o of cur) if (!has(old, o)) add.add(o)
    for (const o of old) if (!has(cur, o)) del.add(o)
    return {add, del}
}

export const patchTags: PatchFn<Set<string | Tag>> = (data, add, del) => {
    const d = new Set(data)
    if (del) for (const s of del) {
        if (typeof s === 'string') d.delete(s)
        else {
            const t = ([...d] as Tag[]).find(a => a.name === s.name)
            if (t) d.delete(t)
        }
    }
    if (add) for (const s of add) {
        if (typeof s === 'string') d.add(s)
        else {
            const t = ([...d] as Tag[]).find(a => a.name === s.name)
            if (t) {
                Object.assign(t, s)
            } else {
                d.add(s)
            }
        }
    }
    return d
}
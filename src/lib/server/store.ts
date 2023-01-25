import {derived, writable} from "svelte/store";
import type {Tag} from "$lib/server/model";
import {Patcher} from "$lib/server/patch";
import {diffTags, patchTags} from "$lib/tagPatchFn";

export const tags = writable([] as Tag[])
export const publishedPost=writable(new Set<number>())
export const tagPatcher = Patcher(patchTags, diffTags,
    derived(tags, ts => new Set<string>([...ts].map(t => t.name))))
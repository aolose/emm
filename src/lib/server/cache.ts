import {derived, writable} from "svelte/store";
import {diffTags, patchTags} from "$lib/tagPatchFn";
import {Patcher} from "$lib/server/patch";
import {tags} from "$lib/store";

export const tagPatcher = Patcher(patchTags, diffTags,
    derived(tags, ts => new Set<string>([...ts].map(t => t.name))))
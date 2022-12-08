import {writable} from "svelte/store";
import {diffTags, patchTags} from "$lib/tagPatchFn";
import {Patcher} from "$lib/server/patch";
import {tags} from "$lib/store";

const tg = writable(new Set<string>())
tags.subscribe(t => tg.set(new Set([...t].map(t => t.name))))
export const tagPatcher =  Patcher(patchTags, diffTags, tg)
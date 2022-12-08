import {Patcher} from "$lib/patch";
import {diffTags, patchTags} from "$lib/server/utils";
import {tags} from "$lib/store";
import {writable} from "svelte/store";

const tg = writable(new Set<string>())
tags.subscribe(t => tg.set(new Set([...t].map(t => t.name))))
export const tagPatcher = Patcher(patchTags, diffTags, tg)
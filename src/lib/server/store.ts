import { derived, writable } from 'svelte/store';
import type { Tag } from '$lib/server/model';
import { Patcher } from '$lib/server/patch';
import { diffStrSet, patchStrSet } from '$lib/setStrPatchFn';

export const tags = writable([] as Tag[]);
export const codes = writable(new Set<string>());
export const publishedPost = writable(new Set<number>());
export const tagPatcher = Patcher(
  patchStrSet,
  diffStrSet,
  derived(tags, (ts) => new Set<string>([...ts].map((t) => t.name)))
);

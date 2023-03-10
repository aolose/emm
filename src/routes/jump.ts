import { saveCache } from "$lib/req";
import { statueSys, status } from "$lib/store";
import type { headInfo } from "$lib/types";
import { writable } from "svelte/store";

const cacheTime = 1e3 * 3600 * 24;
type saveData = headInfo & { statue: number; sys: number }
let cacheData = {} as saveData;
let sys = 0;
let stu = 0;
const save = (a: saveData) => {
  cacheData = { ...cacheData, ...a };
  saveCache("statue", undefined, cacheData, cacheTime);
};
statueSys.subscribe(a => save({ sys: sys = a } as saveData));
status.subscribe((s) => save({ statue: stu = s } as saveData));
export const h = writable({
  title: "", key: "", desc: ""
});

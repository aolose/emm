import { writable } from "svelte/store";
import { req } from "$lib/req";
import type { Obj } from "$lib/types";
import type { System } from "$lib/server/model";

export const sys = writable({} as Obj<System>);
export const load = () => {
  req("sys").then(a => sys.set(a as Obj<System>));
};


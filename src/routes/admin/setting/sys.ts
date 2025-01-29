import { writable } from 'svelte/store';
import { req } from '$lib/req';
import type { Obj } from '$lib/types';
import type { System } from '$lib/server/model';
import { method } from '$lib/enum';

export const sys = writable({} as Obj<System>);
export const load = () => {
	req('sys', undefined, { method: method.GET }).then((a) => {
		sys.set(a as Obj<System>);
	});
};

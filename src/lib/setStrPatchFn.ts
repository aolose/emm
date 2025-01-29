import type { DiffFn, PatchFn } from '$lib/types';
import type { Patcher } from '$lib/server/patch';

type patchFn<T extends object> = ReturnType<typeof Patcher<T>>;
type patch<T extends object> = ReturnType<patchFn<T>>;

export const diffStrSet: DiffFn<Set<string | number>> = (old, cur) => {
	const add: typeof old = new Set();
	const del: typeof old = new Set();
	for (const o of cur) if (!old.has(o)) add.add(o);
	for (const o of old) if (!cur.has(o)) del.add(o);
	return { add, del };
};

export const patchStrSet: PatchFn<Set<string | number>> = (data, add, del) => {
	const d = new Set(data);
	if (del) for (const s of del) d.delete(s);
	if (add) for (const s of add) d.add(s);
	return d;
};
export const versionStrPatch = (patch: patch<Set<string | number>>) => {
	let d = patch[0] + '';
	if (patch.length === 2) {
		d = [d, [...patch[1]].join()].join(' ');
	} else
		d = [d, patch[1] ? [...patch[1]].join() : '', patch[2] ? [...patch[2]].join() : ''].join(' ');
	return d;
};

export const applyStrPatch = (current: Set<string>, patch: string) => {
	const ds = patch.split(' ');
	const [a, b, c] = ds;
	const da = b ? b.split(',') : [];
	const dl = c ? c.split(',') : [];
	let data;
	if (ds.length === 2) {
		data = da;
	} else {
		data = patchStrSet(current, new Set(da), new Set(dl));
	}
	return [+a, data];
};

import type { Model } from '$lib/types';

const sqlInfo = new Map();
export const primaryKey = 'PRIMARY KEY';
type k = keyof Model;
interface PKMap { [key: string]: k; }
export const pkMap: PKMap = {};

function set(clsName: string, name: string, v: string) {
	const k = clsName + '_' + name;
	const p = sqlInfo.get(k) || new Set();
	p.add(v);
	sqlInfo.set(k, p);
}

export function getPrimaryKey(o: string) {
	return pkMap[o];
}

export function getConstraint(o: object, k: string) {
	k = o.constructor.name + '_' + k;
	return sqlInfo.get(k) || new Set();
}

// Helper: detect Stage 3 (target === undefined) vs legacy decorator mode
function resolve(target: object | undefined, nameOrCtx: string | any, fn: (className: string, fieldName: string) => void) {
	if (target === undefined) {
		// Stage 3 decorator — defer via addInitializer
		const ctx = nameOrCtx;
		ctx.addInitializer(function (this: any) {
			fn(this.constructor.name, ctx.name as string);
		});
	} else {
		// Legacy TypeScript decorator
		fn(target.constructor.name, nameOrCtx as string);
	}
}

// UNIQUE, NOT NULL, CHECK and FOREIGN KEY
export function unique(target: object | undefined, nameOrCtx: any) {
	resolve(target, nameOrCtx, (cls, field) => set(cls, field, 'UNIQUE'));
}

export function noNull(target: object | undefined, nameOrCtx: any) {
	resolve(target, nameOrCtx, (cls, field) => set(cls, field, 'NOT NULL'));
}

export function primary(target: object | undefined, nameOrCtx: any) {
	resolve(target, nameOrCtx, (cls, field) => {
		pkMap[cls] = field as k;
		set(cls, field, primaryKey);
	});
}

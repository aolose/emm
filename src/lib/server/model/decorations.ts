import type { Model } from '../../types';

const sqlInfo = new Map();
export const primaryKey = 'PRIMARY KEY';
type k = keyof Model;
interface PKMap {
	[key: string]: k;
}

const pkMap: PKMap = {};

function set(o: object, name: string, v: string) {
	const k = o.constructor.name + '_' + name;
	const p = sqlInfo.get(k) || new Set();
	p.add(v);
	sqlInfo.set(k, p);
}

export function getPrimaryKey(o: object) {
	return pkMap[o.constructor.name];
}

export function getConstraint(o: object, k: string) {
	k = o.constructor.name + '_' + k;
	return sqlInfo.get(k) || new Set();
}

//UNIQUE, NOT NULL, CHECK and FOREIGN KEY
export function unique(target: object, name: string) {
	set(target, name, 'UNIQUE');
}

export function noNull(target: object, name: string) {
	set(target, name, 'NOT NULL');
}

export function primary(target: object, name: string) {
	pkMap[target.constructor.name] = name as k;
	set(target, name, primaryKey);
}

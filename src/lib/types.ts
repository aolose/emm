import type * as models from './server/model';
import type { apiPath } from './server/api';
import type { Post } from './server/model';
import type { method } from '$lib/enum';
import type { DB } from '$lib/server/db/sqlite3';
import { BlackList, RPU } from './server/model';

export type MethodNumber = 0 | 1 | 2 | 3;
export type Class<T> = new (...args: unknown[]) => T;
export type RespHandle = (req: Request) => ApiData | Promise<ApiData>;

export interface dbHooks {
	onSave?: (db: DB, now?: number) => boolean | void;
	onDel?: (db: DB, now?: number) => boolean | void;
}

export type siteMapRecord = {
	url: string;
	lastMod: number;
};

export type Model =
	| models.System
	| models.Tag
	| models.TkTick
	| models.Comment
	| models.ShortPost
	| models.CmUser
	| models.User
	| models.Post
	| models.PostTag
	| models.Res
	| models.FWRule
	| models.TokenInfo
	| models.FwLog
	| models.Require
	| models.BlackList
	| models.RPU
	| models.RPUCache
	| models.FwResp
	| models.RequireMap;

export type Obj<T extends object> = {
	[key in keyof T]?: T[key];
};
export type headInfo = {
	title: string;
	desc: string;
	key: string;
};
export type reqOption = {
	cache?: number;
	delay?: number;
	group?: string;
	delayKey?: number | string;
	fetch?: typeof fetch;
	method?: method;
	key?: string;
	headers?: Headers;
	encrypt?: boolean;
	ctx?: unknown;
	proxy?(data?: unknown, cfg?: reqOption): Promise<reqData>;
	before?(data: unknown, url?: string, ctx?: unknown): [unknown, string | undefined, Headers?];
	done?(result: unknown, ctx?: unknown): void;
	fail?(result: unknown, req: Response, ctx?: unknown): void;
};

export type apiHook = {
	proxy?: (param: reqParams, cfg?: reqOption) => Promise<reqData> | reqData | undefined;
	before?: (param: reqParams) => reqParams | void;
	after?: (param: reqParams, result: unknown) => unknown;
};
export type apiHooks = {
	[key: ApiName]: {
		get?: apiHook;
		post?: apiHook;
		delete?: apiHook;
		patch?: apiHook;
	};
};
export type ApiBodyData = ArrayBuffer | string | number | undefined;
export type ApiData = ApiBodyData | object;
export type ApiName = (typeof apiPath)[number];
export type Api = {
	get?: RespHandle;
	post?: RespHandle;
	delete?: RespHandle;
	patch?: RespHandle;
};

export type APIRoutes = {
	[key: string]: Api;
};

export type reqData = object | string | number | boolean | null | void;
export type reqParams = object | string | number | undefined;
export type cacheRecord = [number, reqData, Promise<reqData> | undefined];
export type reqCache = Map<string, cacheRecord>;

export type fView = {
	id: number;
	size: number;
	name: string;
	type: string;
};

export type fileInfo = {
	id: number;
	size: number;
	name: string;
	type: string;
	up: number;
	abort: () => void;
};
export type fInfo = {
	name: string;
	file: Blob;
};
export type Timer = ReturnType<typeof setTimeout>;
export type cfOpt = {
	show: boolean;
	text?: string;
	ok?: string;
	cancel?: string;
	resolve?: (v: unknown) => void;
	reject?: (v: unknown) => void;
};
export type fileSelectCfg = {
	show?: boolean;
	limit?: number;
	type?: string;
	resolve?: (v: unknown) => void;
	reject?: (v: unknown) => void;
};
export type curPost = Obj<Post> & { _?: number };
export type DatePatch<T> = {
	expire: number;
	add?: T;
	del?: T;
	size: number;
};
export type version = number;
export type PatchPool<T> = Map<version, DatePatch<T>>;
export type PatchFn<T> = (data: T, add?: T, del?: T) => T;
export type DiffFn<T> = (old: T, cur: T) => { add: T; del: T };
export type func<T> = (this: T, ...params: unknown[]) => unknown;
type pmsFn = (r: reqData | PromiseLike<reqData>) => void;
export type PromiseConnector = { resolve?: pmsFn; reject?: pmsFn };
export type connectFn = (resolve?: pmsFn, reject?: pmsFn) => void;

import type { Statement } from 'sqlite3';
import type { RunResult } from 'sqlite3';
import type * as models from './server/model';
import type * as apis from './server/api';

type RespHandle = (req: Request) => Promise<ApiData>;

export type Model = models.System | models.Count | models.User | models.Article;
export type sqlQueryCallback<T> = (
	cb: (this: Statement, err: Error | null, row: T) => void
) => void;
export type sqlRunCallback = (cb: (this: RunResult, err: Error | null) => void) => void;
export type promiseCallback<T> = (
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (reason?: unknown) => void
) => void;
export type ApiBodyData = ArrayBuffer | string | number | undefined;
export type ApiData = ApiBodyData | object;
export type ApiName = keyof typeof apis;
export type Api = {
	get?: RespHandle;
	post?: RespHandle;
	delete?: RespHandle;
	patch?: RespHandle;
};

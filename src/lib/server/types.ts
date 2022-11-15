import type {Statement} from "sqlite3";
import type {RunResult} from "sqlite3";

export type sqlQueryCallback<T> = (cb: (this: Statement, err: Error | null, row: T) => void) => void
export type sqlRunCallback<T> = (cb: (this: RunResult, err: Error | null) => void) => void
export type promiseCallback<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void


import type * as models from "./model";

type RespHandle = (req:Request) => Promise<Response>
export type Model = models.System | models.Count | models.User | models.Article

import type * as apis from "./api";
export type ApiName = keyof typeof  apis

export type Api = {
    get?: RespHandle,
    post?: RespHandle,
    delete?: RespHandle,
    patch?: RespHandle
}

import type {Statement} from "sqlite3";
import type {RunResult} from "sqlite3";

export type sqlQueryCallback<T> = (cb: (this: Statement, err: Error | null, row: T) => void) => void
export type sqlRunCallback<T> = (cb: (this: RunResult, err: Error | null) => void) => void
export type promiseCallback<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void


import type * as models from "./server/model";
import type {RequestEvent} from "@sveltejs/kit";

type RespHandle = (event: RequestEvent) => Promise<Response>

export type Model = models.System | models.Count | models.User | models.Article

export type Api = {
    get?: RespHandle,
    post?: RespHandle,
    delete?: RespHandle,
    patch?: RespHandle
}

import type * as models from './server/model';
import type {apiPath} from './server/api'
import type {Post} from "./server/model";
import type {method} from "$lib/enum";
import type {DB} from "$lib/server/db/sqlite3";

export type MethodNumber = 0 | 1 | 2 | 3
export type Class<T> = new (...args: unknown[]) => T;
export type RespHandle = (req: Request) => ApiData | Promise<ApiData>;

export interface dbHooks {
    onSave?: (db: DB, now?: number) => boolean | void
    onDel?: (db: DB, now?: number) => boolean | void
}

export type Model =
    (models.System | models.Tag | models.Comment | models.Count | models.User | models.Post | models.Res)

export type Obj<T extends Model> = {
    [key in keyof T]?: T[key];
}

export type reqOption = {
    cache?: number;
    delay?: number;
    delayKey?: number | string;
    fetch?: typeof fetch;
    method?: method;
    encrypt?: boolean;
    before?(data: unknown, url?: string): [unknown, string | undefined, Headers?];
};

export type CliObj<T extends Model> = Obj<T> & { _: number }

export type ApiBodyData = ArrayBuffer | string | number | undefined;
export type ApiData = ApiBodyData | object;
export type ApiName = typeof apiPath[number];
export type Api = {
    get?: RespHandle;
    post?: RespHandle;
    delete?: RespHandle;
    patch?: RespHandle;
};


export type APIRoutes = {
    [key: string]: Api
}

export type reqData = object | string | number | boolean | null | void;
export type reqParams = object | string | number | undefined;
export type cacheRecord = [number, reqData, Promise<reqData> | undefined];
export type reqCache = Map<string, cacheRecord>;

export type fView = {
    id: number,
    size: number,
    name: string,
    type: string
}

export type fileInfo = {
    id: number;
    size: number;
    name: string;
    type: string;
    up: number;
    abort: () => void;
};
export  type fInfo = {
    name: string;
    file: Blob;
};
export  type Timer = ReturnType<typeof setTimeout>
export type cfOpt = {
    show: boolean,
    text?: string,
    ok?: string,
    cancel?: string,
    resolve?: (v: unknown) => void,
    reject?: (v: unknown) => void,
}
export  type fileSelectCfg = {
    show?: boolean,
    limit?: number,
    resolve?: (v: unknown) => void,
    reject?: (v: unknown) => void,
}
export type curPost = Obj<Post> & { _?: number }
export type DatePatch<T> = {
    expire: number
    add?: T
    del?: T,
    size: number
}
export type version = number
export type PatchPool<T> = Map<version, DatePatch<T>>
export type PatchFn<T> = (data: T, add?: T, del?: T) => T
export type DiffFn<T> = (old: T, cur: T) => ({ add: T, del: T })
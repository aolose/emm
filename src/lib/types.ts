import type * as models from './server/model';
import type {apiPath} from './server/api'
import type {Post} from "./server/model";
import type {Database} from 'better-sqlite3';

export type MethodNumber = 0 | 1 | 2 | 3
export type Class<T> = new (...args: unknown[]) => T;
export type RespHandle = (req: Request) => ApiData | Promise<ApiData>;

interface dbHooks {
    onSave?: (db: Database) => boolean
    onDel?: (db: Database) => boolean
}

export type Model = (models.System | models.Count | models.User | models.Post | models.Res) & dbHooks;

export type Obj<T extends Model> = {
    [key in keyof T]?: T[key];
}

export type reqOption = {
    cache?: number;
    delay?: number;
    delayKey?: number | string;
    fetch?: typeof fetch;
    method?: 0 | 1 | 2 | 3;
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
import type * as models from './server/model';
import type * as apis from './server/api';

export type Class<T> = new (...args: unknown[]) => T;
export type RespHandle = (req: Request) => ApiData | Promise<ApiData>;
export type Model = models.System | models.Count | models.User | models.Post | models.Res;

export type ApiBodyData = ArrayBuffer | string | number | undefined;
export type ApiData = ApiBodyData | object;
export type ApiName = keyof typeof apis;
export type Api = {
    get?: RespHandle;
    post?: RespHandle;
    delete?: RespHandle;
    patch?: RespHandle;
};

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


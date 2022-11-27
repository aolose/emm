import type * as models from './server/model';
import type * as apis from './server/api';

export type RespHandle = (req: Request) => ApiData | Promise<ApiData>;

export type Model = models.System | models.Count | models.User | models.Post;
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

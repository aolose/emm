import type * as models from './server/model';
import type * as apis from './server/api';

type RespHandle = (req: Request) => ApiData | Promise<ApiData>;

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

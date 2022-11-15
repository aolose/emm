import type {Handle} from "@sveltejs/kit";
import * as apis from "./lib/server/api";
import type {Api, ApiName} from "./lib/server/types";

export const handle: Handle = async ({event, resolve}) => {
    // handle api
    const {url: {pathname}, request: {method}} = event
    if (pathname.startsWith('/api/')) {
        const k = pathname.slice(5) as ApiName;
        const m = method.toLowerCase() as keyof Api
        const api = apis[k]?.[m]
        if (api) {
            return await api(event.request)
        }
    }
    return resolve(event);
}
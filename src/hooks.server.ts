import type {Handle} from "@sveltejs/kit";
import {apis} from "./lib/server/api";
import type {Api} from "./lib/types";


export const handle: Handle = async ({event, resolve}) => {
    // handle api
    const {url: {pathname}, request: {method}} = event
    if (pathname.startsWith('/api/')) {
        const k = pathname.slice(5);
        const m = method.toLowerCase() as keyof Api
        const api = apis.get(k)?.[m]
        if(api) {
            return  await api(event)
        }
    }
    return resolve(event);
}
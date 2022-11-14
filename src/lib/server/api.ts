import type {Api} from "../types";

export const apis = new Map<string, Api>([
    ["aa", {
        async get() {
            // todo
            return new Response('ok')
        }
    }]
])
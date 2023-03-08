import {useApi} from "$lib/req";
import {method} from "$lib/enum";
import {seo} from "$lib/store";
import type {headInfo} from "$lib/types";
import {adminRedirect} from "$lib/utils";
import {redirect} from "@sveltejs/kit";

export const load = useApi('statue',
    undefined,
    {
        method: method.GET, done(d: unknown,ctx) {
            const o = (d as headInfo & { statue: number })
            seo.update(a => ({...a, ...o}))
            const rd = adminRedirect(o.statue, (ctx as {url:URL}).url.pathname)
            if(rd)return redirect(307,rd)
        }
    })
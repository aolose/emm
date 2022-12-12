import type {Handle} from '@sveltejs/kit';
import {contentType, encryptIv, encTypeIndex} from '$lib/enum';
import {fwFilter} from "$lib/server/firewall";
import {checkStatue, sysStatue} from "$lib/server/utils";
import {checkRedirect} from "$lib/utils";

checkStatue()
export const handle: Handle = async ({event, resolve}) => {
    const pn = event.url.pathname
    console.log(pn)
    if (!/^\/(api|res|font|src)/.test(pn)) {
        const p = checkRedirect(sysStatue, pn)
        if (p) {
            return new Response('', {
                status: 307,
                headers: new Headers({
                    location: p
                })
            })
        }else if(pn==='/config'){
        }
    }
    const r = fwFilter(event)
    if (r) return new Response('', {status: 403})
    return resolve(event, {
        filterSerializedResponseHeaders: (name) =>
            [contentType, encryptIv, encTypeIndex].indexOf(name.toLowerCase()) > -1
    });
};

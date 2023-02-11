import type { Handle, HandleServerError } from "@sveltejs/kit";
import { contentType, encryptIv, encTypeIndex } from "$lib/enum";
import { fwFilter, reqRLog } from "$lib/server/firewall";
import { checkStatue, sysStatue } from "$lib/server/utils";
import { checkRedirect } from "$lib/server/utils";

checkStatue();
export const handle: Handle = async ({ event, resolve }) => {
  const pn = event.url.pathname;
  let mk = "";
  let res: Response | undefined;
  if (!/^\/(api|res|font|src)/.test(pn)) {
    const p = checkRedirect(sysStatue, pn, event.request);
    if (p) {
      res = new Response("", {
        status: 307,
        headers: new Headers({
          location: p
        })
      });
    }
  } else {
    mk = fwFilter(event);
    if (mk) res = new Response("", { status: 403 });
  }
  if (!res) res = await resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      [contentType, encryptIv, encTypeIndex].indexOf(name.toLowerCase()) > -1
  });
  reqRLog(event, res.status, mk);
  return res;
};

export const handleError = (({ error, event }) => {
  const { data, message ,status} = error as {
    status:number,
    data: string, message: string };
  return {
    message: message || data,
    status:status
  };
})  satisfies HandleServerError;
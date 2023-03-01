import type { Handle, HandleServerError } from "@sveltejs/kit";
import { contentType, encryptIv, encTypeIndex } from "$lib/enum";
import { fwFilter, reqRLog } from "$lib/server/firewall";
import { checkStatue, sysStatue } from "$lib/server/utils";
import { checkRedirect } from "$lib/server/utils";

checkStatue();
export const handle: Handle = async ({ event, resolve }) => {
  const pn = event.url.pathname;
  let res: Response | undefined;
  const fr = fwFilter(event);
  if (fr?.noAccess) res = new Response("", { status: 403 });
  else if (!/^\/(api|res|font|src)/.test(pn)) {
    const p = checkRedirect(sysStatue, pn, event.request);
    if (p) {
      res = new Response("", {
        status: 307,
        headers: new Headers({
          location: p
        })
      });
    }
  }
  if (!res) res = await resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      [contentType, encryptIv, encTypeIndex].indexOf(name.toLowerCase()) > -1
  });
  reqRLog(event, res.status, fr);
  return res;
};

export const handleError = (({ error, event }) => {
  console.error(error)
  const { data, message, status } = error as {
    status: number,
    data: string, message: string
  };
  return {
    message: message || data,
    status: status
  };
})  satisfies HandleServerError;
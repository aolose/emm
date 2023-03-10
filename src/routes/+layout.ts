import { useApi } from "$lib/req";
import { method } from "$lib/enum";
import { seo, statueSys, status } from "$lib/store";
import type { headInfo } from "$lib/types";
import { redirect } from "@sveltejs/kit";
import type { Page } from "@sveltejs/kit";
import { page } from "$app/stores";
import { h } from "./jump";
import { browser } from "$app/environment";

const cacheTime = 1e3 * 3600 * 24;
let pathname = "";
let routId = "";

const ps = (p: Page) => {
  routId = p.route?.id || "";
  pathname = p.url?.pathname || "";
};
const ss = (a: headInfo) => {
  const cur = a[routId] as headInfo;
  const { title, key, desc } = { ...a, ...cur } as { title: string, key: string, desc: string };
  h.set({ title, key, desc });
};

if (browser) {
  page.subscribe(ps);
  seo.subscribe(ss);
}

export const load = useApi("statue", undefined, {
  cache: cacheTime,
  method: method.GET,
  done(d: unknown,ctx) {
    const o = d as headInfo & { statue: number; sys: number };
    pathname=(ctx  as { url: URL }).url.pathname
    const { statue, sys } = o;
    if(browser){
      seo.update((a) => ({ ...a, ...o }));
      statueSys.set(sys);
    } else{
      ss(o)
    }
    const adm = "/admin";
    const lg = "/login";
    const cfg = "config";
    if (pathname === cfg && sys > 1) {
      return "/";
    }
    let rd = "";
    if (statue && pathname === lg) rd = adm;
    else if (!statue && pathname.startsWith(adm)) rd = lg;
    if (rd) throw redirect(307, rd);
  }
});

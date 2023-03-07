import {useApi} from "$lib/req";
import {method} from "$lib/enum";
import { seo } from "$lib/store";
import type { headInfo } from "$lib/types";

export const load = useApi('statue',
    undefined,
    {method: method.GET,done(d: unknown) {
        seo.update(a=>({...a,...(d as headInfo)}))
      }})
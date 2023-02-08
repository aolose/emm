import type { apiHooks } from "$lib/types";
import type { Post } from "$lib/server/model";

/**
 * add global hook for browser side requests
 */
export const hooks: apiHooks = {
  post: {
   post:{
     before(o) {
       const d = o as Post;
       if (Array.isArray(d._reqs)) return {
         ...d,
         _reqs: d._reqs.map(a => a.id).join()
       };
     }
   }
  }
};
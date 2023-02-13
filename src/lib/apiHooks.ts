import type {apiHooks, Model} from "$lib/types";
import type {Post, Tag} from "$lib/server/model";
import {modelArr2Str} from "$lib/utils";

/**
 * add global hook for browser side requests
 */
export const hooks: apiHooks = {
    tag: {
        post: {
            before: o => modelArr2Str(o, "_posts")
        }
    },
    post: {
        post: {
            before: (o: Post & { _?: number }) => {
                if (o.id && o._) delete o._
                modelArr2Str(o, "_reqs")
            }
        }
    }
};
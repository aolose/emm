import type { apiHooks, Model } from "$lib/types";
import type { Post, Tag } from "$lib/server/model";
import { modelArr2Str } from "$lib/utils";

/**
 * add global hook for browser side requests
 */
export const hooks: apiHooks = {
  tag: {
    post: {
      before: o => modelArr2Str(o as Tag, "_posts")
    }
  },
  post: {
    post: {
      before: o => modelArr2Str(o as Post, "_reqs")
    }
  }
};
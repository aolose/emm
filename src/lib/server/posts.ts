import { get } from "svelte/store";
import { tags } from "$lib/server/store";
import { patchPostTags, tagPostCache } from "$lib/server/cache";
import { pageBuilder, sqlFields } from "$lib/server/utils";
import { Post } from "$lib/server/model";

export const pubPostList = (page: number, size: number, tag: string|null, skips?: number[]) => {
  const where: string[] = ["published=?"];
  const values: unknown[] = [1];

  if (tag) {
    const tg = get(tags).find(a => a.name === tag);
    const ps = tg ? tagPostCache.getPostIds(tg.id) : [];
    if (ps.length) {
      where.push(`id in (${sqlFields(ps.length)})`);
      values.push(...ps);
    }
  }
  if (skips) {
    where.push(`id not in (${sqlFields(skips.length)})`);
    values.push(...skips);
  }
  return pageBuilder(page, size, Post,
    ["createAt desc"], [
      "banner", "desc",
      "content", "createAt",
      "_tag", "title", "slug"
    ],
    [where.join(" and "), ...values],
    patchPostTags
  );
};
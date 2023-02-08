import { NULL } from "../enum";
import { noNull, primary, unique } from "./decorations";
import { model, setNull, uniqSlug, val } from "$lib/server/utils";
import { diffObj, filter, slugGen } from "$lib/utils";
import type { DB } from "$lib/server/db/sqlite3";
import { publishedPost, tags } from "$lib/server/store";
import type { Obj } from "$lib/types";
import { reqPostCache, tagPostCache } from "$lib/server/cache";

const { INT, TEXT } = NULL;

export class Res {
  @primary
  id = INT;
  type = TEXT;
  size = INT;
  name = TEXT;
  @unique
  md5 = TEXT;
  save = INT;
  thumb = INT;
  userId = INT;
}

export class ShortPost {
  @primary
  id = INT;
  comment = true;
  content = TEXT;
  token = TEXT;
  publish = INT;
  modify = INT;
  createAt = INT;
  userId = INT;
}

export class Tag {
  @primary
  id = INT;
  @unique
  name = TEXT;
  desc = TEXT;
  createAt = INT;
  userId = INT;
  banner = TEXT;
  _posts?:string|{id:number,title:string}[]
}

export class PostTag {
  @primary
  id = INT;
  postId = INT;
  tagId = INT;
}

export class Post {
  @primary
  id = INT;
  banner = INT;
  slug = TEXT;
  desc = TEXT;
  _tag = TEXT;
  published = 0;
  comment = 1;
  title = TEXT;
  content = TEXT;
  title_d = TEXT;
  content_d = TEXT;
  createAt = INT;
  publish = INT;
  modify = INT;
  save = INT;
  userId = INT;
  _p = 0;
  _reqs?: string | { id: number, name: string }[];
  // reqId
  _r: number[] | undefined;

  onSave(db: DB, now: number) {
    const { id, title_d, title, content_d, content } = this;
    const oo = id ? db.get(model(this.constructor as FunctionConstructor, { id })) : {};
    const ori = oo as Post;
    const df = diffObj(
      filter({ ...ori } as Post, ["content_d", "content", "title", "title_d"], false),
      filter({ ...this }, ["content_d", "content", "title", "title_d"], false)
    ) as Post;
    if(typeof this._reqs==='string'){
      const ids = this._reqs.split(',').filter(a=>/\d+/g.test(a)).map(a=>+a)
      reqPostCache.setReqs(id,ids)
    }
    if (this._p) {
      if (ori?.publish) {
        this.modify = now;
      } else this.publish = now;
      if (!ori.published) this.published = 1;
      const c = content_d || ori.content_d;
      const t = title_d || ori.title_d;
      if (t && ori.title !== t) {
        this.title = t;
        if (ori.title_d) setNull(this, "title_d");
      }
      if (c && this.content !== c) {
        this.content = c;
        if (ori.content_d) setNull(this, "content_d");
      }
      const ti = t || title || ori.title;
      const sl = this.slug || ori.slug;
      if (!sl && ti) {
        this.slug = slugGen(ti);
      }
      if (this.slug) {
        const s = uniqSlug(this.id, this.slug);
        if (s && ori.slug !== this.slug) this.slug = s;
      }
      publishedPost.update(a => new Set([...a, id]));
    } else if (this.published === 0) publishedPost.update(a => {
      a.delete(id);
      return new Set([...a]);
    });
    if (this._tag && id) {
      const tags = this._tag.split(",").filter(a => a);
      tagPostCache.setTags(id, tags);
    }
    return !df;
  }
}

export class Require {
  @primary
  id = INT;
  @noNull
  @unique
  name = TEXT;
  @noNull
  type = INT; // enum.type
  remark = TEXT;
  createAt = INT;
  _posts?: Obj<Post>[];
  _postIds?: string;
}

export class RequireMap {
  @primary
  id = INT;
  reqId = INT;
  targetId = INT;
  type = INT;
}


export class Comment {
  @primary
  id = INT;
  @noNull
  name = TEXT;
  avatar = INT;
  @noNull
  say = TEXT;
  publish = INT;
  reply = INT;
  state = INT; // -1 skip 0 - wait review  1 - review ok 2 - review no pass
  token = TEXT;
  pass = true;
  createAt = INT;
  modify = INT;
  userId = INT;

}

export class System {
  @primary
  id = INT;
  admUsr = TEXT;
  admPwd = TEXT;
  uploadDir = TEXT;
  thumbDir = TEXT;
  blogName = TEXT;
  blogUrl = TEXT;
  blogBio = TEXT;
  ipLiteToken = TEXT;
  ipLiteDir = TEXT;
  codeLogin = true;
  description = TEXT;
  keywords = TEXT;
  comment = false; // use comment
  noSpam = false; // check spam comment
  commentReview = false; // check comment
  analysis = false; // use analysis
  pageScript = TEXT;
  pageCss = TEXT;
  robots = TEXT;
}

export class User {
  @primary
  id = INT;
  @noNull
  name = TEXT;
  avatar = TEXT;
  @noNull
  pwd = TEXT;
  birth = INT;
  desc = TEXT;
  createAt = INT;
  role = INT;
}

export class FWRule {
  @primary
  id = INT;
  mark = TEXT;
  ip = TEXT;
  path = TEXT;
  method = TEXT;
  headers = TEXT;
  createAt = INT;
  save = INT;
  log = false;
  noAccess = false;
  country = TEXT;
  active = true;
}

export class FwLog {
  @primary
  id = INT;
  ip = TEXT;
  path = TEXT;
  method = TEXT;
  headers = TEXT;
  save = INT;
  mark = TEXT;
  _city = "";
}

export class TokenInfo {
  @primary
  id = INT;
  expire = INT;
  code? = TEXT;
  times? = INT;
  used? = INT;
  type = INT;
  value? = TEXT;

  set _reqs(reqs: Set<number> | undefined) {
    if (reqs === undefined) this.value = TEXT;
    else this.value = [...reqs].join();
  }

  get _reqs(): Set<number> | undefined {
    return this.value ? new Set((this.value).split(",").map(a => +a).filter(a => a)) : undefined;
  }

  createAt = INT;
}
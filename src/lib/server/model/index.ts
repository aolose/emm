import {NULL} from '../enum'
import {noNull, primary, unique} from './decorations'
import {DBProxy, model, setNull, uniqSlug} from "$lib/server/utils";
import {slugGen} from "$lib/utils";
import type {DB} from "$lib/server/db/sqlite3";
import {tags} from "$lib/store";
import {get} from "svelte/store";
import {diffTags} from "$lib/tagPatchFn";

const {INT, TEXT} = NULL

export class Count {
    @primary
    key = INT
    count = INT
}

export class Res {
    @primary
    id = INT
    type = TEXT
    size = INT
    name = TEXT
    @unique
    md5 = TEXT
    save = INT
    thumb = INT
}

export class ShortPost {
    @primary
    id = INT
    comment = true
    content = TEXT
    token = TEXT
    publish = INT
    modify = INT
    createAt = INT
}

export class Tag {
    @primary
    name = TEXT
    desc = TEXT
    createAt = INT
    post = TEXT
}

export class Post {
    @primary
    id = INT
    banner = INT
    slug = TEXT
    desc = TEXT
    tag = TEXT
    published = 0
    comment = 1
    title = TEXT
    content = TEXT
    title_d = TEXT
    content_d = TEXT
    token = TEXT
    createAt = INT
    publish = INT
    modify = INT
    save = INT
    _p = 0

    onSave(db: DB, now: number) {
        const {id, title_d, title, content_d, content} = this
        const oo = id ? db.get(model(this.constructor as FunctionConstructor, {id})) : {}
        const ori = oo as Post
        if (this._p) {
            if (ori?.publish) {
                this.modify = now
            } else this.publish = now
            if (!ori.published) this.published = 1
            const c = content_d || ori.content_d
            const t = title_d || ori.title_d
            if (t && ori.title !== t) {
                this.title = t
                if (ori.title_d) setNull(this, 'title_d')
            }
            if (c && this.content !== c) {
                this.content = c
                if (ori.content_d) setNull(this, 'content_d')
            }
            const ti = t || title || ori.title
            const sl = this.slug || ori.slug
            if (!sl && ti) {
                this.slug = slugGen(ti)
            }
            if (this.slug) {
                const s = uniqSlug(this.id, this.slug)
                if (s && ori.slug !== this.slug) this.slug = s
            }
        }
        if (this.tag !== undefined && id) {
            const cur = this.tag?.split(',') || []
            let as = new Set<string>(cur.filter(a=>!!a))
            let ds = new Set<string>()
            if (ori.tag) {
                const old = ori.tag.split(',')
                const {add, del} = diffTags(new Set(old), new Set(cur))
                as = new Set([...as, ...add])
                ds = new Set([...del])
            }
            const tgs = get(tags).filter(a=>!!a)
            const _id = id + ''
            tgs.forEach(t => {
                const {name} = t
                const ps = new Set(t.post.split(','))
                let ch = 0
                if (as.has(name)) {
                    if (!ps.has(_id)) {
                        ps.add(_id)
                        ch = 1
                    }
                    as.delete(name)
                }
                if (ds.has(name)) {
                    if (ps.has(_id)) {
                        ps.delete(_id)
                        ch = 1
                    }
                    ds.delete(name)
                }
                if (ch) t.post = [...ps].join()
            })
            if (as.size) {
                tags.update(u => u.concat([...as].map(a => DBProxy(Tag, {name: a, post: _id}))))
            }
        }
    }
}

export class Token {
    @primary
    id = INT
    @noNull
    @unique
    name = TEXT
    @noNull
    @unique
    code = TEXT
    @noNull
    type = INT // enum.type
    features = TEXT // enum.features
    @noNull
    expire = INT
    targetIds = TEXT
    remark = TEXT
    createAt = INT

}

export class Comment {
    @primary
    id = INT
    @noNull
    name = TEXT
    @noNull
    say = TEXT
    publish = INT
    reply = INT
    state = INT // -1 skip 0 - wait review  1 - review ok 2 - review no pass
    token = INT
    pass = true
    createAt = INT
    modify = INT
}

export class System {
    @primary
    id = INT
    admUsr = TEXT
    admPwd = TEXT
    uploadDir = TEXT
    thumbDir = TEXT
    blogName = TEXT
    blogUrl = TEXT
    blogBio = TEXT
    ipLiteToken = TEXT
    ipLiteDir = TEXT
    description = TEXT
    keywords = TEXT
    apiCors = TEXT
    comment = false // use comment
    noSpam = false // check spam comment
    commentReview = false // check comment
    firewall = false // use firewall
    analysis = false // use analysis
    rss = false // use rss
    pageScript = TEXT
    pageCss = TEXT
}

export class User {
    @primary
    id = INT
    @noNull
    name = TEXT
    avatar = TEXT
    @noNull
    pwd = TEXT
    birth = INT
    desc = TEXT
    createAt = INT
}

export class FWRule {
    @primary
    id = INT
    mark = TEXT
    @noNull
    @unique
    ip = TEXT
    path = TEXT
    ua = TEXT
    createAt = INT
    save = INT
    log = false
    noAccess = false
    country = TEXT
}

export class FwLog {
    @primary
    id = INT
    ip = TEXT
    path = TEXT
    ua = TEXT
    save = INT
    mark = TEXT
    _city = ''
}
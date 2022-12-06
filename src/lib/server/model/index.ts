import {NULL} from '../enum'
import {noNull, primary, unique} from './decorations'
import {model, setNull, uniqSlug} from "$lib/server/utils";
import {slugGen} from "$lib/utils";

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
    published = false
    comment = true
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

    onSave(db, now) {
        if (this._p) {
            const {id, title_d, title, content_d, content} = this
            const ori = id ? db.get(model(this.constructor, {id})) : {}
            if (ori.publish) {
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

import {NULL} from '../enum'
import {noNull, primary, unique} from './decorations'

const {INT, TEXT, DATE} = NULL

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
    save = DATE
    thumb = INT
}

export class ShortPost {
    @primary
    id = INT
    comment = true
    content = TEXT
    token = TEXT
    publish = DATE
    modify = DATE
    createAt = DATE
}

export class Tag {
    @primary
    id = INT
    @unique
    @noNull
    name = TEXT
    desc = TEXT
    save = DATE
    createAt = DATE
}

export class Post {
    @primary
    id = INT
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
    createAt = DATE
    publish = DATE
    modify = DATE
    save = DATE
}

export class Token {
    @primary
    id = INT
    @noNull
    @unique
    key = TEXT
    @noNull
    type = INT // enum.type
    features = TEXT // enum.features
    @noNull
    expire = INT
    targetIds = TEXT
    remark = TEXT
    createAt = DATE
}

export class Comment {
    @primary
    id = INT
    @noNull
    name = TEXT
    @noNull
    say = TEXT
    publish = DATE
    reply = INT
    state = INT // -1 skip 0 - wait review  1 - review ok 2 - review no pass
    token = INT
    pass = true
    createAt = DATE
    modify = DATE
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
    birth = DATE
    desc = TEXT
    createAt = DATE
}

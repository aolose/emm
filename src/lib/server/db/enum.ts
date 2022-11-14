export const NULL = {
    INT: -1,
    TEXT: '-',
    DATE: new Date(0)
}

export enum TOKEN_TYPE {
    Admin,
    Aulth,
    Article, // for pwd article
    Comment  // for comment owner
}

export enum TOKEN_FEATURE {
    allowComment,
    allowVist,
}
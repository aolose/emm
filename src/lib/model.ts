import {NULL} from "./db/enum";
import {noNull, primary, unique} from "./db/model";

const {INT, TEXT, DATE} = NULL

export class Count {
    @primary
    @noNull
    key = INT
    count = INT
}

export class Article {
    @primary
    id = INT;
    @unique
    @noNull
    slug = TEXT
    title = TEXT
    content = TEXT
}


export class System {
    @primary
    id = INT
}

export class User {
    @primary
    id = INT;
    @noNull
    name = TEXT
    avatar = TEXT
    @noNull
    pwd = TEXT
    birth = DATE
    desc = TEXT
}

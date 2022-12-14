export const NULL = {
	INT: -1,
	TEXT: '-',
	DATE: new Date(0)
};

export enum permission {
	Admin,
	Article, // for pwd article
	Comment // for comment owner
}

export enum token_statue{
	ok,
	expire,
	unknown
}

export const NULL = {
	INT: -1,
	TEXT: '-',
	DATE: new Date(0)
};

export enum permission {
	Admin,
	Post, // for pwd article
	Comment // for comment owner
}

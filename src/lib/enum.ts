export const reqMethod = ['POST', 'GET', 'DELETE', 'PATCH'];

export enum method {
	POST,
	GET,
	DELETE,
	PATCH
}

export const dataType = {
	json: 'application/json',
	text: 'text/plain',
	binary: 'application/octet-stream'
};

const types = Object.values(dataType);

export const geTypeIndex = (a: string) => types.indexOf(a) + '';
export const getIndexType = (a: string | null) => a && types[parseInt(a)];
export const encryptIv = 'eiv';
export const encTypeIndex = 'eti';
export const contentType = 'content-type';

export enum permission {
	Admin,
	Post, // for pwd article
	Read // for try
}

export enum pmsName {
	Admin = 'fully control',
	Read = 'read data',
	Post = 'read posts'
}

export enum cmStatus {
	Pending,
	Approve,
	Reject
}

// HTTP method names corresponding to the numeric `method` enum below.
// Used via `reqMethod[method.GET]` to get the string form.
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
} as const;

// MIME type array for index<->value lookups by geTypeIndex / getIndexType
const types: string[] = Object.values(dataType);

export const geTypeIndex = (a: string) => types.indexOf(a) + '';
export const getIndexType = (a: string | null) => a && types[parseInt(a)];
export const encryptIv = 'eiv';
export const encTypeIndex = 'eti';
export const contentType = 'content-type';

export enum permission {
	Admin,
	Post, // grants access to password-protected posts
	Read // grants read-only data access (e.g. trial users)
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

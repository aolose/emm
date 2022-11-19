export const reqMethod = ['POST', 'GET', 'DELETE', 'PATCH'];

export const dataType = {
	json: 'application/json',
	text: 'text/pain',
	binary: 'application/octet-stream'
};

const types = Object.values(dataType);

export const geTypeIndex = (a: string) => types.indexOf(a) + '';
export const getIndexType = (a: string | null) => a && types[parseInt(a)];
export const encryptIv = 'eiv';
export const encTypeIndex = 'eti';
export const contentType = 'content-type';

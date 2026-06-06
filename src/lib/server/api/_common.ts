import type { RespHandle } from '$lib/types';
import type { SQLQueryBindings } from 'bun:sqlite';
import { db, sys } from '../index';
import {
	checkStatue,
	debugMode,
	delCookie,
	getClient,
	getIp,
	getReqJson,
	model,
	resp,
	setToken,
	sqlFields,
	sysStatue,
	pageBuilder
} from '../utils';
import { permission } from '$lib/enum';
import { enc, legacyEnc, filter, trim } from '$lib/utils';
import { genToken } from '$lib/server/token';
import { Post } from '$lib/server/model';

const { Admin, Read } = permission;

/** Page size constants */
export const REQS_PAGE_SIZE = 4;
export const POSTS_DEFAULT_SIZE = 10;
export const VISITOR_PAGE_SIZE = 20;
export const LOGIN_TRY_LIMIT = 3;
export const LOGIN_DELAY_BASE = 10_000;

/** Simple inline MIME type lookup by file extension */
export const mimeLookup = (name: string): string => {
	const i = name.lastIndexOf('.');
	if (i === -1) return '';
	const ext = name.slice(i + 1).toLowerCase();
	return (
		{
			aac: 'audio/aac',
			avif: 'image/avif',
			avi: 'video/x-msvideo',
			bmp: 'image/bmp',
			bz: 'application/x-bzip',
			bz2: 'application/x-bzip2',
			css: 'text/css',
			csv: 'text/csv',
			doc: 'application/msword',
			docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			epub: 'application/epub+zip',
			gz: 'application/gzip',
			gif: 'image/gif',
			htm: 'text/html',
			html: 'text/html',
			ico: 'image/vnd.microsoft.icon',
			ics: 'text/calendar',
			jar: 'application/java-archive',
			jpeg: 'image/jpeg',
			jpg: 'image/jpeg',
			js: 'text/javascript',
			json: 'application/json',
			jsonld: 'application/ld+json',
			mid: 'audio/midi',
			midi: 'audio/midi',
			mjs: 'text/javascript',
			mp3: 'audio/mpeg',
			mp4: 'video/mp4',
			mpeg: 'video/mpeg',
			odp: 'application/vnd.oasis.opendocument.presentation',
			ods: 'application/vnd.oasis.opendocument.spreadsheet',
			odt: 'application/vnd.oasis.opendocument.text',
			oga: 'audio/ogg',
			ogv: 'video/ogg',
			ogx: 'application/ogg',
			opus: 'audio/opus',
			otf: 'font/otf',
			png: 'image/png',
			pdf: 'application/pdf',
			php: 'application/x-httpd-php',
			ppt: 'application/vnd.ms-powerpoint',
			pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			rar: 'application/vnd.rar',
			rtf: 'application/rtf',
			sh: 'application/x-sh',
			svg: 'image/svg+xml',
			tar: 'application/x-tar',
			tif: 'image/tiff',
			tiff: 'image/tiff',
			ts: 'video/mp2t',
			ttf: 'font/ttf',
			txt: 'text/plain',
			vsd: 'application/vnd.visio',
			wav: 'audio/wav',
			weba: 'audio/webm',
			webm: 'video/webm',
			webp: 'image/webp',
			woff: 'font/woff',
			woff2: 'font/woff2',
			xhtml: 'application/xhtml+xml',
			xls: 'application/vnd.ms-excel',
			xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			xml: 'application/xml',
			xul: 'application/vnd.mozilla.xul+xml',
			zip: 'application/zip',
			'7z': 'application/x-7z-compressed',
			md: 'text/markdown',
			yml: 'text/yaml',
			yaml: 'text/yaml',
			svelte: 'text/plain',
			tsx: 'text/plain',
			vue: 'text/plain'
		}[ext] || ''
	);
};

/** Parse a comma-separated string of numeric IDs from a request body */
export const parseIds = async (req: Request): Promise<number[]> =>
	(await req.text())
		.split(',')
		.filter((a) => a)
		.map((v) => +v);

/** Build a SQL WHERE clause from a search string against title/content fields */
export const buildSearchWhere = (
	sc: string | undefined,
	fields: { ft?: number; v: SQLQueryBindings[]; w: string[] }
): [string, ...SQLQueryBindings[]] | undefined => {
	sc = trim(sc);
	if (!sc) return fields.w.length ? [fields.w.join(' or '), ...fields.v] : undefined;
	const s = `%${sc}%`;
	if (!fields.ft || fields.ft & 1) {
		fields.w.push('(title like ? or title_d like ?)');
		fields.v.push(s, s);
	}
	if (!fields.ft || fields.ft & 2) {
		fields.w.push('(content like ? or content_d like ?)');
		fields.v.push(s, s);
	}
	return [fields.w.join(' or '), ...fields.v];
};

/** Serialize concurrent requests for the same draft to prevent race-condition duplicates */
const draftLocks = new Map<string, Promise<void>>();
export async function withDraftLock(uuid: string, fn: () => Promise<void>): Promise<void> {
	const prev = draftLocks.get(uuid);
	let resolve: () => void;
	const next = new Promise<void>((r) => {
		resolve = r;
	});
	draftLocks.set(
		uuid,
		(prev || Promise.resolve()).then(() => next)
	);
	try {
		await prev;
		await fn();
	} finally {
		resolve!();
		const cur = draftLocks.get(uuid);
		if (cur === next || (cur && prev && cur === prev)) {
			draftLocks.delete(uuid);
		}
	}
}

/** Auth wrapper — checks permissions before calling the handler */
export const auth = (ps: permission | permission[], fn: RespHandle) => (req: Request) => {
	if (!sysStatue) return resp('system uninitialized', 500);
	if (!debugMode) {
		const requires = new Set(([] as permission[]).concat(ps));
		const client = getClient(req);
		if (requires.size) {
			if (!client) {
				const r = resp('invalid token:' + req.url, 401);
				delCookie(r, 'token');
				return r;
			}
			if (!client.ok(Admin)) {
				for (const p of requires) {
					const s = client.ok(p);
					if (s) continue;
					else {
						const r = resp('no permission', 401);
						delCookie(r, 'token');
						return r;
					}
				}
			}
		}
	}
	return fn(req);
};

export const sysKs: (keyof import('$lib/server/model').System)[] = [
	'tsEnabled',
	'tsSiteKey',
	'tsVerifyTTL',
	'blogName',
	'blogBio',
	'linkedin',
	'github',
	'robots',
	'uploadDir',
	'maxFireLogs',
	'thumbDir',
	'ipLiteDir',
	'seoKey',
	'seoDesc',
	'cfAccountId',
	'cfListId',
	'r2Enabled',
	'r2AccountId',
	'r2AccessKeyId',
	'r2SecretAccessKey',
	'r2Bucket',
	'r2PublicDomain',
	'fwAggregate',
	'fwLastCount',
	'fwLastAggregateAt',
	'aiModel'
];

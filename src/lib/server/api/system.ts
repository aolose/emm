import type { APIRoutes } from '../../types';
import { db, server, sys } from '../index';
import { checkStatue, combineResult, DBProxy, getClient, getReqJson, mkdir,
	model, mv, resp, throwDbProxyError } from '../utils';
import { filter, trim } from '$lib/utils';
import { System } from '$lib/server/model';
import { auth } from './_common';
import { permission } from '$lib/enum';
import { geoClose, geoStatue, loadGeoDb } from '$lib/server/ipLite';
import { genPubKey } from '../crypto';
import { getRuv } from '$lib/server/puv';
import { validateCfToken, getCfLists, addIpToList } from '$lib/server/cloudflare';

const { Admin, Read } = permission;

const apis: APIRoutes = {
	geo: { get: auth(Read, () => geoStatue()) },
	hello: {
		async post(request) { const buf = await request.arrayBuffer(); const [id, pk] = await genPubKey(buf); return combineResult(id, pk); }
	},
	setUp: {
		post: auth(Admin, async (req) => {
			const p = await req.text();
			if (!p) return resp('invalid directory', 500);
			const [a, b] = p.split(',');
			if (!a || !b || a === b) return resp('invalid directory', 500);
			let err = mkdir(a); if (!err) err = mkdir(b);
			if (!err) { sys.uploadDir = a; sys.thumbDir = b; }
			checkStatue();
			return resp(err, err ? 500 : 200);
		})
	},
	setGeo: {
		post: auth(Admin, async (req) => {
			const p = await req.text();
			if (!p) { sys.ipLiteToken = ''; checkStatue(); }
			else { const [tk, ph] = p.split(','); if (tk) sys.ipLiteToken = tk; if (ph) sys.ipLiteDir = ph; checkStatue(); loadGeoDb(); }
			return '';
		})
	},
	sys: {
		get: auth(Read, (req) => {
			const ks = [...sysKs] as (keyof System)[];
			// Only expose sensitive fields to Admin
			if (getClient(req)?.ok(Admin)) ks.push('ipLiteToken', 'tsSecret', 'cfApiToken');
			return filter(sys, ks);
		}),
		post: auth(Admin, async (req) => {
			const o = filter(await req.json(), [...sysKs, 'tsSecret', 'cfApiToken']) as System;
			let loadGeo;
			for (const [k, v] of Object.entries(o)) {
				const kk = k as keyof System;
				if (kk === 'tsSecret' || kk === 'cfApiToken') {
					// Sensitive: stored but never returned in public GET
					const n = trim(v as string);
					if (n !== sys[kk]) (sys as Record<string, unknown>)[kk] = n;
					continue;
				}
				const n = trim(v as string);
				if (n && n !== sys[kk]) {
					const isGeo = 'ipLiteDir' === kk || 'ipLiteToken' === kk;
					if (isGeo) { geoClose(); }
					if (['uploadDir', 'thumbDir', 'ipLiteDir'].includes(kk)) {
						const err = mv(sys[kk] as string, n); if (err) return resp(err, 500);
					}
					if ((kk === 'ipLiteDir' && sys[kk] !== o[kk]) || (kk === 'ipLiteToken' && o[kk] !== sys[kk])) loadGeo = 1;
					(sys as Record<string, unknown>)[kk] = n;
				}
			}
			if (loadGeo && sys.ipLiteDir && sys.ipLiteToken) { loadGeoDb(); }
		})
	},
	cfValidate: {
		get: auth(Admin, async () => {
			const ok = await validateCfToken();
			return { valid: ok };
		})
	},
	cfLists: {
		get: auth(Admin, async () => {
			return await getCfLists();
		})
	},
	home: { get() { return [sys.linkedin, sys.github, sys.blogBio]; } },
	puv: {
		get: auth(Read, (req) => {
			const params = new URL(req.url).searchParams;
			const start = +(params.get('s') || ''); const end = +(params.get('e') || ''); const type = +(params.get('t') || '');
			if (!start || !end) return [];
			return getRuv(start, end, type);
		})
	},
};

import { sysKs } from './_common';
export default apis;

import type { APIRoutes } from '../../types';
import { db, server, sys } from '../index';
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
	sysStatue
} from '../utils';
import { enc, legacyEnc, filter, setPwdSalt } from '$lib/utils';
import { validate, formatErrors } from '$lib/server/validate';
import { contentType, dataType, permission } from '$lib/enum';
import { genToken } from '$lib/server/token';
import { blockIp } from '$lib/server/firewall';
import { auth, LOGIN_TRY_LIMIT, LOGIN_DELAY_BASE } from './_common';
import { dirname, resolve } from 'path';
import { mkdir } from '../utils';

const { Admin, Read } = permission;

const apis: APIRoutes = {
	logout: {
		get: () => {
			const res = resp('');
			delCookie(res, 'token');
			return res;
		}
	},
	check: {
		get: (req) => {
			const c = getClient(req);
			let s = 0;
			if (c) {
				if (c.ok(permission.Read)) s = 2;
				if (c.ok(permission.Admin)) s = 1;
			}
			return s;
		}
	},
	statue: {
		get: (req) => {
			checkStatue();
			let s = 0;
			if (debugMode) s = 1;
			else {
				const c = getClient(req);
				if (c) {
					if (c.ok(permission.Read)) s = 2;
					if (c.ok(permission.Admin)) s = 1;
				}
			}
			return filter(
				{
					statue: s,
					sys: sysStatue,
					key: sys?.seoKey,
					desc: sys?.seoDesc,
					title: sys?.blogName,
					pwdSalt: sys?.pwdSalt !== '-' ? sys?.pwdSalt : '',
					r2PublicDomain: sys?.r2PublicDomain || '',
					r2Enabled: !!sys?.r2Enabled
				},
				[],
				false
			);
		}
	},
	login: {
		post: async (req) => {
			if (sysStatue < 2) return resp(-1, 500);
			const ip = getIp(req);
			const [q, sv] = blockIp('lg', ip);
			if (q[1]) {
				sv();
				return resp(q[1], 403);
			}
			const body = await getReqJson(req);
			if (!Array.isArray(body) || body.length !== 3) return resp('invalid request', 400);
			const [u, p, v] = body;
			if (
				typeof u !== 'string' ||
				typeof p !== 'string' ||
				(typeof v !== 'string' && typeof v !== 'number')
			)
				return resp('invalid request', 400);
			if (sys.pwdSalt && sys.pwdSalt !== '-') setPwdSalt(sys.pwdSalt);
			let ok = (await enc(sys.admUsr + v)) === u && (await enc(sys.admPwd + v)) === p;
			if (!ok) {
				setPwdSalt('');
				ok = (await legacyEnc(sys.admUsr + v)) === u && (await legacyEnc(sys.admPwd + v)) === p;
			}
			if (ok) {
				const res = resp('');
				setToken(req, res, genToken(Admin));
				q[0] = 0;
				sv();
				return res;
			} else {
				q[0]++;
				q[1] = Math.floor(Math.pow(2, q[0] - LOGIN_TRY_LIMIT)) * LOGIN_DELAY_BASE;
				sv();
				return resp(q[1], 403);
			}
		}
	},
	dbPath: {
		post: async (req) => {
			if (sysStatue) return resp('', 403);
			const p = await req.text();
			if (!p) return 'empty path';
			const pa = resolve(p);
			const dir = dirname(pa);
			try {
				const err = mkdir(dir);
				if (!err) server.start(p);
				if (err) return err;
				else {
					await Bun.write(resolve('.dbCfg'), p);
					checkStatue();
				}
			} catch (e) {
				return resp(e?.toString(), 500);
			}
		}
	},
	setAdmin: {
		async post(req) {
			const cli = getClient(req);
			const isAdm = cli?.ok(Admin);
			if (!isAdm && (!sys || (sys.admUsr && sys.admPwd))) return resp('', 401);
			const d = await getReqJson(req);
			const vres = validate(d, { usr: 'string', pwd: 'string' });
			if (!vres.ok) return resp(formatErrors(vres.errors), 400);
			const { usr, pwd } = vres.data;
			if (usr && pwd) {
				if (!sys.pwdSalt || sys.pwdSalt === '-') {
					sys.pwdSalt = crypto.randomUUID();
				}
				setPwdSalt(sys.pwdSalt);
				sys.admUsr = await enc(usr as string);
				sys.admPwd = await enc(pwd as string);
				const res = resp('');
				checkStatue();
				if (!isAdm) setToken(req, res, genToken(Admin));
				return res;
			} else {
				return resp('username or password is empty', 400);
			}
		}
	}
};

export default apis;

import type { APIRoutes } from '../../types';
import { db } from '../index';
import { getClient, getIp, getReqJson, model, pageBuilder, resp } from '../utils';
import { arrFilter } from '$lib/utils';
import { BlackList, FwLog, FwResp, FWRule } from '$lib/server/model';
import { auth, parseIds } from './_common';
import { permission } from '$lib/enum';
import { addRule, blackLists, blockIp, delBlackList, delFwResp, delRule, filterLog,
	fw2log, fwRespLis, getFwResp, isIpBlocked, getLogCacheEntries, lsRules,
	patchDetailIpInfo, saveBlackList, setFwResp } from '$lib/server/firewall';
import { ipInfoStr } from '$lib/server/ipLite';
import type { FWRule as FWRuleType } from '$lib/server/model';

const { Admin, Read } = permission;

const apis: APIRoutes = {
	log: {
		post: auth(Read, async (req) => {
			const t = (await req.json()) as FWRuleType & { type: number; page: number; size: number; t: number };
			const { page, size, type } = t;
			const lgs = filterLog(type ? db.all(model(FwLog)).map(fw2log) : getLogCacheEntries(), t);
			const l = lgs.length;
			const total = Math.floor((l + t.size - 1) / t.size);
			const st = l - page * size;
			const d = lgs.slice(Math.max(st, 0), st + size).filter((a) => { return t.t ? a.createAt > t.t : 1; });
			if (t) { return { total, data: patchDetailIpInfo(d) }; }
		})
	},
	bip: {
		post: auth(Read, async (req) => {
			const ip = await req.text();
			if (ip) { const o = isIpBlocked(ip); if (getFwResp(o?.respId)?.status === 403) return 1; }
		})
	},
	rule: {
		post: auth(Admin, async (req) => {
			const r = model(FWRule, await req.json());
			if ((r.ip && /^(::1|127\.0)/.test(r.ip)) || r.ip === getIp(req)) return resp('invalid ip', 500);
			addRule(r as FWRuleType); return r.id;
		})
	},
	bks: {
		post: auth(Read, async (req) => { const r = new Uint16Array(await req.arrayBuffer()); return blackLists(r[0], r[1]); })
	},
	blk: {
		post: auth(Admin, async (req) => {
			const b = model(BlackList, await req.json()) as BlackList;
			if (!b.id) return resp('id not exist', 500);
			saveBlackList(b);
		}),
		delete: auth(Admin, async (req) => { const ids = await parseIds(req); delBlackList(...ids); })
	},
	rules: {
		delete: auth(Admin, async (req) => { const ids = await parseIds(req); delRule(ids); return; }),
		post: auth(Read, async (req) => {
			const r = new Uint16Array(await req.arrayBuffer());
			const o = lsRules(r[0], r[1]);
			o.items = arrFilter(o.items, ['id','path','headers','ip','mark','country','log','active','trigger','status','rate','respId','uaMode','cfUpload','ua','uaCount','schedule','createAt','method','weight']) as FWRuleType[];
			return o;
		})
	},
	fwRsp: {
		get: auth(Read, () => fwRespLis()),
		post: auth(Admin, async (req) => { return setFwResp(model(FwResp, await req.json())); }),
		delete: auth(Admin, async (req) => { const id = +(await req.text()); if (id) delFwResp(id); })
	},
};

export default apis;

import { model, sysStatue } from '$lib/server/utils';
import { RPU, RPUCache } from '$lib/server/model';
import { isbot } from 'isbot';
import { db, server } from '$lib/server/index';
import { arrFilter } from '$lib/utils';

// === hash utilities ===
let hashSeed: number;
const cyrb53 = (str: string, seed = 0) => {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
};

const hashIP = (ip: string) => cyrb53(ip, hashSeed);

// === IP prefix grouping for bounded-memory UV (#8) ===
// store at most MAX_IP_GROUPS unique IPs; when exceeded, fall back to count-only
const MAX_IP_GROUPS = 50_000;
type UVGroup = {
	hashes: Set<string>;
	overflow: boolean;
	total: number;
};

const makeGroup = (): UVGroup => ({ hashes: new Set(), overflow: false, total: 0 });

const groupAdd = (g: UVGroup, h: string) => {
	if (g.overflow) {
		g.total++;
		return;
	}
	if (g.hashes.has(h)) return;
	if (g.hashes.size >= MAX_IP_GROUPS) {
		g.overflow = true;
		g.total = g.hashes.size + 1;
		g.hashes.clear(); // free memory
		return;
	}
	g.hashes.add(h);
};

const groupSize = (g: UVGroup) => g.overflow ? g.total : g.hashes.size;

const groupToArr = (g: UVGroup): string[] => g.overflow ? [] : [...g.hashes];

const groupFromArr = (arr: string[]): UVGroup => {
	const g = makeGroup();
	for (const h of arr) {
		if (g.hashes.size >= MAX_IP_GROUPS) {
			g.overflow = true;
			g.total = g.hashes.size + arr.length - g.hashes.size;
			g.hashes.clear();
			return g;
		}
		g.hashes.add(h);
	}
	return g;
};

// === state ===
let rqH = 0;
let rqD = 0;
let pvH = 0;
let pvD = 0;
const uvH: UVGroup = makeGroup();
const uvD: UVGroup = makeGroup();
const _uvH: UVGroup = makeGroup();
const _uvD: UVGroup = makeGroup();

let currentNd: number;
let currentNh: number;
const hour = 3600 * 1e3;
const day = hour * 24;

export const loadPuv = () => {
	const now = Date.now();
	const nh = Math.floor(now / hour);
	const nd = Math.floor(now / day);
	currentNh = nh;
	currentNd = nd;
	// rotate seed each boot so hashes aren't stable across restarts (#7)
	hashSeed = (now ^ (now >>> 8)) & 0x7fffffff;

	const od = db.get(model(RPU, { type: 1, t: nd }));
	const op = db.get(model(RPU, { type: 0, t: nh }));
	if (od) {
		rqD = od.r;
		pvD = od.p;
		Object.assign(uvD, groupFromArr((db.get(model(RPUCache, { id: 1 }))?.value || '').split(',').filter(Boolean)));
		Object.assign(_uvD, groupFromArr((db.get(model(RPUCache, { id: 2 }))?.value || '').split(',').filter(Boolean)));
		// #9 recover UV from today's remaining RPU records if cache empty
		if (!groupSize(uvD) && !groupSize(_uvD)) {
			recoverUVFromDB(1, nd, uvD, _uvD);
		}
	}
	if (op) {
		rqH = op.r;
		pvH = op.p;
		Object.assign(uvH, groupFromArr((db.get(model(RPUCache, { id: 3 }))?.value || '').split(',').filter(Boolean)));
		Object.assign(_uvH, groupFromArr((db.get(model(RPUCache, { id: 4 }))?.value || '').split(',').filter(Boolean)));
	}
};

// #9: rebuild UV counts from raw RPU records when cache is empty
const recoverUVFromDB = (type: number, t: number, vu: UVGroup, _vu: UVGroup) => {
	const rows = db.all(model(RPU), 't=? and type=?', t, type);
	for (const row of rows) {
		const r = model(RPU, row) as RPU;
		// u = valid UV count, ur-u = invalid UV count
		// we can recover counts but not individual hashes — this is a best-effort approximation
		if (r.u) {
			vu.overflow = true;
			vu.total = (vu.total || 0) + r.u;
		}
		if (r.ur && r.ur > (r.u || 0)) {
			_vu.overflow = true;
			_vu.total = (_vu.total || 0) + (r.ur - (r.u || 0));
		}
	}
};

// cross-window reset happens inline in ruv() now; save() only persists.
const save = () => {
	if (sysStatue < 2 || server.maintain) return;
	changed = 0;
	const now = Date.now();
	const md = model(RPU, {
		type: 1,
		t: currentNd,
		r: rqD,
		p: pvD,
		u: groupSize(uvD),
		ur: groupSize(uvD) + groupSize(_uvD)
	});
	const mp = model(RPU, {
		type: 0,
		t: currentNh,
		r: rqH,
		p: pvH,
		u: groupSize(uvH),
		ur: groupSize(uvH) + groupSize(_uvH)
	});
	// check exist
	const od = db.get(model(RPU, { type: 1, t: currentNd }));
	const op = db.get(model(RPU, { type: 0, t: currentNh }));
	if (od) md.id = od.id;
	if (op) mp.id = op.id;
	db.save(md);
	db.save(mp);
	// clear rec before 90d, every 30d
	const bf = currentNh - 24 * 90;
	const lastCleanKey = 99;
	const lastClean = db.get(model(RPUCache, { id: lastCleanKey }))?.value || '0';
	if (now - +lastClean > 30 * day) {
		db.del(model(RPU), 't <=?', bf);
		db.save(model(RPUCache, { id: lastCleanKey, value: String(now) }));
	}
	db.save(model(RPUCache, { id: 1, value: groupToArr(uvD).join(',') }));
	db.save(model(RPUCache, { id: 2, value: groupToArr(_uvD).join(',') }));
	db.save(model(RPUCache, { id: 3, value: groupToArr(uvH).join(',') }));
	db.save(model(RPUCache, { id: 4, value: groupToArr(_uvH).join(',') }));
};

// flush one slot (type=0 hour, type=1 day) to DB with the given t index
const flushSlot = (type: number, t: number) => {
	const isDay = type === 1;
	const r = isDay ? rqD : rqH;
	const p = isDay ? pvD : pvH;
	const u = isDay ? uvD : uvH;
	const _u = isDay ? _uvD : _uvH;
	const m = model(RPU, {
		type,
		t,
		r,
		p,
		u: groupSize(u),
		ur: groupSize(u) + groupSize(_u)
	});
	const exist = db.get(model(RPU, { type, t }));
	if (exist) m.id = (exist as RPU).id;
	db.save(m);
};

const checkTimeWindow = () => {
	const now = Date.now();
	const nh = Math.floor(now / hour);
	const nd = Math.floor(now / day);

	if (nh !== currentNh) {
		// save old hour slot before resetting
		if (changed) flushSlot(0, currentNh);
		Object.assign(uvH, makeGroup());
		Object.assign(_uvH, makeGroup());
		rqH = 0;
		pvH = 0;
		currentNh = nh;
	}
	if (nd !== currentNd) {
		// save old day slot before resetting
		if (changed) flushSlot(1, currentNd);
		Object.assign(uvD, makeGroup());
		Object.assign(_uvD, makeGroup());
		rqD = 0;
		pvD = 0;
		currentNd = nd;
	}
};

let changed = 1;

export const ruv = ({
	ip,
	status,
	path,
	ua
}: {
	ip: string;
	status: number;
	path: string;
	ua: string;
}) => {
	// inline cross-window check (#5)
	checkTimeWindow();

	const valid =
		status < 300 && (path === '/' || /^\/(post|tag)s?\/?$/.test(path)) && !isbot(ua);
	const h = hashIP(ip); // #7 hash IP
	rqD++;
	rqH++;
	if (valid) {
		pvD++;
		pvH++;
		groupAdd(uvD, h);
		groupAdd(uvH, h);
	} else {
		groupAdd(_uvD, h);
		groupAdd(_uvH, h);
	}
	changed = 1;
	scheduleSave();
};

// idle-save: persist 5s after last request rather than fixed 10s polling (#10)
let saveTimer: ReturnType<typeof setTimeout>;
const scheduleSave = () => {
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		checkTimeWindow();
		if (changed) save();
	}, 5000);
};

// periodic cross-window check even when idle (#4)
setInterval(() => {
	checkTimeWindow();
}, 1e4);

export const getRuv = (start: number, end: number, type = 0) => {
	return arrFilter(
		db.all(model(RPU), `t>=? and t<=? and type=? order by t asc`, start, end, type),
		['t', 'r', 'p', 'u', 'ur']
	);
};
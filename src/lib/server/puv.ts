import { model, sysStatue } from "$lib/server/utils";
import { RPU, RPUCache } from '$lib/server/model';
import isbot from 'isbot';
import { db, server } from "$lib/server/index";
import { arrFilter } from '$lib/utils';

let rqH = 0;
let rqD = 0;
let pvH = 0;
let pvD = 0;
const _uvH = new Set<string>();
const _uvD = new Set<string>();
const uvH = new Set<string>();
const uvD = new Set<string>();

let dStart = Date.now();
let hStart = Date.now();
const hour = 3600 * 1e3;
const day = hour * 24;

export const loadPuv = () => {
	const now = Date.now();
	const nh = Math.floor(now / hour);
	const nd = Math.floor(now / day);
	const od = db.get(model(RPU, { type: 1, t: nd }));
	const op = db.get(model(RPU, { type: 0, t: nh }));
	if (od) {
		rqD = od.r;
		pvD = od.p;
		uvD.clear();
		_uvD.clear();
		(db.get(model(RPUCache, { id: 1 }))?.value || '').split(',').forEach((a) => uvD.add(a));
		(db.get(model(RPUCache, { id: 2 }))?.value || '').split(',').forEach((a) => _uvD.add(a));
		// fill width fake data all because all ip lost
	}
	if (op) {
		rqH = op.r;
		pvH = op.p;
		uvH.clear();
		_uvH.clear();
		(db.get(model(RPUCache, { id: 3 }))?.value || '').split(',').forEach((a) => uvH.add(a));
		(db.get(model(RPUCache, { id: 4 }))?.value || '').split(',').forEach((a) => _uvH.add(a));
	}
};

const save = () => {
	if(sysStatue<2||server.maintain)return;
	changed = 0;
	const now = Date.now();
	const nh = Math.floor(now / hour);
	const nd = Math.floor(now / day);
	const md = model(RPU, {
		type: 1,
		t: nd,
		r: rqD,
		p: pvD,
		u: uvD.size,
		ur: uvD.size + _uvD.size
	});
	const mp = model(RPU, {
		type: 0,
		t: nh,
		r: rqH,
		p: pvH,
		u: uvH.size,
		ur: uvH.size + _uvH.size
	});
	// check exist
	const od = db.get(model(RPU, { type: 1, t: nd }));
	const op = db.get(model(RPU, { type: 0, t: nh }));
	if (od) md.id = od.id;
	if (op) mp.id = op.id;
	db.save(md);
	db.save(mp);
	// clear rec before 90d
	const bf = nh - 24 * 90;
	if (bf > nh && 0 === bf % (30 * day)) db.del(model(RPU), 't <=?', bf);
	const hDur = now - hStart;
	const dDur = now - dStart;
	if (hDur > hour) {
		uvH.clear();
		_uvH.clear();
		rqH = 0;
		pvH = 0;
		hStart = now;
	}
	if (dDur > day) {
		uvD.clear();
		_uvD.clear();
		rqD = 0;
		pvD = 0;
		dStart = now;
	}
	db.save(model(RPUCache, { id: 1, value: [...uvD].join() }));
	db.save(model(RPUCache, { id: 2, value: [..._uvD].join() }));
	db.save(model(RPUCache, { id: 3, value: [...uvH].join() }));
	db.save(model(RPUCache, { id: 4, value: [..._uvH].join() }));
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
	const valid =
		status < 300 && (path === '/' || /^\/((post|tag|)s?|ticket)/.test(path)) && !isbot(ua);
	rqD++;
	rqH++;
	if (valid) {
		pvD++;
		pvH++;
		uvD.add(ip);
		uvH.add(ip);
	} else {
		_uvD.add(ip);
		_uvH.add(ip);
	}
	changed = 1;
};
// 10s loop check
setInterval(() => {
	if (changed) save();
}, 1e4);

export const getRuv = (start: number, end: number, type = 0) => {
	return arrFilter(
		db.all(model(RPU), `t>=? and t<=? and type=? order by t asc`, start, end, type),
		['t', 'r', 'p', 'u', 'ur']
	);
};

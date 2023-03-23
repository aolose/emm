import { model } from '$lib/server/utils';
import { RPU } from '$lib/server/model';
import isbot from 'isbot';
import { db } from '$lib/server/index';
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
		let u = od.u;
		let r = od.ur;
		uvD.clear();
		_uvD.clear();
		// fill width fake data all because all ip lost
		while (u--) {
			uvD.add(u + '');
			_uvD.add(-u + '');
		}
		while (r--) {
			_uvD.add(r + '');
		}
	}
	if (op) {
		rqH = op.r;
		pvH = op.p;
		let u = op.u;
		let r = op.ur;
		uvH.clear();
		_uvH.clear();
		while (u--) {
			uvH.add(u + '');
			_uvH.add(-u + '');
		}
		while (r--) {
			_uvH.add(r + '');
		}
	}
};

const save = () => {
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

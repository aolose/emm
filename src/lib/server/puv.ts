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

const rec = (type: number, time: number) => {
	const n = Math.floor(time / hour);
	const m = model(RPU, {
		type,
		t: n
	});
	if (type) {
		m.r = rqD;
		m.p = pvD;
		m.u = uvD.size;
		m.ur = m.u + _uvD.size;
		rqD = 0;
		pvD = 0;
		uvD.clear();
		_uvD.clear();
		dStart = time;
	} else {
		m.r = rqH;
		m.p = pvH;
		m.u = uvH.size;
		m.ur = m.u + _uvH.size;
		rqH = 0;
		pvH = 0;
		uvH.clear();
		_uvH.clear();
		hStart = time;
	}
	db.save(m);
	const bf = n - 24 * 90;
	db.del(model(RPU), 't <=?', bf);
};

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

	const now = Date.now();
	const hDur = now - hStart;
	const dDur = now - dStart;
	if (hDur > hour) {
		rec(0, now);
	}
	if (dDur > day) {
		rec(1, now);
	}
};

export const getRuv = (start: number, end: number, type = 0) => {
	return arrFilter(
		db.all(model(RPU), `t>=? and t<=? and type=? order by t asc`, start, end, type),
		['t', 'r', 'p', 'u', 'ur']
	);
};

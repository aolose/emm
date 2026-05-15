import { NULL } from '../enum';
import { primary } from './decorations';
import { str2Hds } from '$lib/utils';

const { INT, TEXT } = NULL;

export class FWRule {
	@primary
	id = INT;
	mark = TEXT;
	ip = TEXT;
	path = TEXT;
	method = TEXT;
	headers = TEXT;
	createAt = INT;
	save = INT;
	log = false;
	country = TEXT;
	active = true;
	rate = TEXT;
	trigger = false;
	status = TEXT;
	respId = INT;

	rateLimiter(): [number, (times: number, dur: number) => number] {
		const rates: [number, number][] = [];
		const s = new Set();
		if (this.rate)
			this.rate
				.replace(/[^0-9,/]/g, '')
				.split(',')
				.filter((a) => a)
				.map((a) => {
					const [c, d = 3600] = a.split('/');
					let e = +c;
					const f = +d * 1e3;
					if (e < 0) e = 1;
					if (e && f) {
						const k = `${e}:${f}`;
						if (!s.has(k)) {
							s.add(k);
							rates.push([e, f]);
						}
					}
				});
		return [
			Math.max(...rates.map((a) => a[1]), 0),
			(times: number, dur: number) => {
				let n = 0;
				for (const [count, window] of rates) {
					if (dur <= window && times >= count) {
						return count;
					}
				}
				return n;
			}
		];
	}

	onSave() {}
	onDel() {}
	toResp() { return; }
}

export class FwResp {
	@primary
	id = INT;
	name = TEXT;
	headers = TEXT;
	status = INT;
	createAt = INT;

	toResp() {
		const hs = new Headers(str2Hds(this.headers));
		if (hs.has('location')) {
			return new Response('', { status: this.status || 302, headers: hs });
		}
		return new Response('', { status: this.status || 403, headers: hs });
	}
}

export class FwLog {
	@primary
	id = INT;
	ip = TEXT;
	path = TEXT;
	headers = TEXT;
	status = INT;
	method = TEXT;
	createAt = INT;
	mark = TEXT;
	geo = TEXT;
}

export class BlackList {
	@primary
	id = INT;
	ip = TEXT;
	mark = TEXT;
	createAt = INT;
	respId = INT;
	_geo?: string;

	toRule(): FWRule {
		const r = new FWRule();
		r.ip = this.ip;
		r.mark = this.mark;
		r.respId = this.respId || -1;
		return r;
	}
}

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
	// Collection mode — UA-based distributed crawler detection
	uaMode = false;
	ua = TEXT;
	uaCount = TEXT;
	// UA collection window in seconds (default 60, range 30-3600)
	uaWindow = 60;
	// Turnstile abandon mode — detect crawlers that don't follow 307 redirects
	abandon = false;
	timeout = 3;
	// Universal fields
	schedule = TEXT;
	cfUpload = false;
	weight = 100;

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
				const n = 0;
				for (const [count, window] of rates) {
					if (dur <= window && times >= count) {
						return count;
					}
				}
				return n;
			}
		];
	}

	/** Parse uaCount as a threshold number (default 1). */
	getUaCountThreshold(): number {
		const n = parseInt(this.uaCount);
		return n > 0 ? n : 1;
	}

	/** Parse timeout for abandon mode in seconds (default 3, clamped 1-10). */
	getTimeout(): number {
		const n = this.timeout ?? 3;
		return Math.max(1, Math.min(10, n));
	}

	/** Parse UA collection window in seconds (default 60, clamped 30-3600). */
	getUaWindow(): number {
		const n = this.uaWindow ?? 60;
		return Math.max(30, Math.min(3600, n));
	}

	/** Check if current UTC hour is within the schedule ranges.
	 *  Empty schedule = always active.
	 *  Format: "0-6,18-23,23-2" (comma-separated hour ranges, 0-23 inclusive).
	 *  When a > b the range crosses midnight (e.g. 23-2 = 23:00–02:00). */
	isInSchedule(): boolean {
		if (!this.schedule || this.schedule === '-') return true;
		const hour = new Date().getUTCHours();
		return this.schedule.split(',').some((range) => {
			const [a, b] = range.split('-').map(Number);
			if (isNaN(a) || isNaN(b)) return false;
			if (a > b) return hour >= a || hour <= b; // crossing midnight
			return hour >= a && hour <= b;
		});
	}

	onSave() {}
	onDel() {}
	toResp() {
		return;
	}
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
	save = INT;
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

export class WhiteList {
	@primary
	id = INT;
	ip = TEXT;
	mark = TEXT;
	createAt = INT;
	_geo?: string;
}

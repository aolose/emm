import { resolve } from 'path';
import { sys } from '$lib/server/index';
import { mkdir, findEntry, saveEntry, unZip } from '$lib/server/utils';
import { IP2Location } from 'ip2location-nodejs';

const ip2location = new IP2Location();
const db_type = 'DB3';
const url = `https://www.ip2location.com/download/?token=$TOKEN&file=${db_type}LITEBINIPV6`;

let currentAbortController: AbortController | null = null;
let curDownLoad = '';
let downloading = 0;
let dbVersion = '';
let dbFile: string | undefined;
let updateTimer: ReturnType<typeof setTimeout>;
let isInitialized = false;

const DB_FILENAME_PATTERN = /^ip2location_lite_(\d+)\.bin$/i;

// === HTTP helper ===
const httpGet = async (url: string, signal?: AbortSignal) => {
	const res = await fetch(url, { signal, redirect: 'follow' });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return new Uint8Array(await res.arrayBuffer());
};

// === Core state ===
export const geoStatue = () => (downloading ? '-' : dbVersion || '');

export const geoClose = () => {
	ip2location.close();
	dbVersion = '';
	dbFile = undefined;
};

// === DB loading ===
const load = (file: string) => {
	if (typeof file !== 'string') return;
	try {
		ip2location.close(); // reset library state so open() will re-initialize
		ip2location.open(file);
		dbVersion = new Date().toISOString().slice(0, 10);
		dbFile = file;
	} catch (e) {
		console.error('IP2Location load error:', e);
		dbVersion = '';
		dbFile = undefined;
	}
};

// === Local file management ===
const findLocalFile = async (dir: string): Promise<string | undefined> => {
	try {
		let latest = 0;
		let latestFile = '';
		const glob = new Bun.Glob('ip2location_lite_*.bin');

		for await (const f of glob.scan({ cwd: dir, absolute: false })) {
			const m = f.match(DB_FILENAME_PATTERN);
			if (m) {
				const ts = +m[1];
				if (ts > latest) {
					latest = ts;
					latestFile = f;
				}
			}
		}
		return latestFile || undefined;
	} catch {
		return undefined;
	}
};

const cleanOldFiles = async (dir: string, keepFile: string) => {
	try {
		const glob = new Bun.Glob('ip2location_lite_*.bin');
		for await (const f of glob.scan({ cwd: dir, absolute: false })) {
			if (f !== keepFile) {
				try {
					await Bun.file(resolve(dir, f)).delete();
				} catch (e: unknown) {
					console.error('unlink error:', f, e?.toString());
				}
			}
		}
	} catch (e) {
		console.error('clean old files error:', e);
	}
};

// === Update logic ===
const checkUpdate = async () => {
	const tk = sys.ipLiteToken;
	const dir = sys.ipLiteDir;
	if (!tk || !dir) return;

	const err = mkdir(dir);
	if (err) {
		console.error(err);
		return;
	}

	if (curDownLoad && curDownLoad === tk) return;

	currentAbortController?.abort();
	currentAbortController = new AbortController();

	curDownLoad = tk;
	downloading = 1;

	try {
		console.log('ip2location: downloading DB...');
		const downloadUrl = url.replace('$TOKEN', tk);
		const data = await httpGet(downloadUrl, currentAbortController.signal);

		const name = `ip2location_lite_${Date.now()}.bin`;
		const latest = resolve(dir, name);

		// IP2Location returns a ZIP containing the BIN file
		const files = await unZip(data);
		const file = findEntry(files, `IP2LOCATION-LITE-${db_type}.IPV6.BIN`);
		if (!file) {
			console.error('ip2location: BIN file not found in downloaded ZIP');
			return;
		}

		await saveEntry(file, latest);
		await cleanOldFiles(dir, name);
		load(latest);
		console.log('ip2location: DB updated successfully');
	} catch (e: unknown) {
		if ((e as Error)?.name !== 'AbortError') {
			console.error('ip2location update error:', e);
		}
	} finally {
		downloading = 0;
		curDownLoad = '';
		currentAbortController = null;
	}
};

export const loadGeoDb = async () => {
	const dir = sys.ipLiteDir && resolve(sys.ipLiteDir);
	if (!dir) return;

	const err = mkdir(dir);
	if (err) {
		console.error(err);
		return;
	}

	if (updateTimer) {
		clearTimeout(updateTimer);
	}

	if (!isInitialized) {
		const existing = await findLocalFile(dir);
		if (existing) {
			load(resolve(dir, existing));
		}
		isInitialized = true;
	}

	const checkInterval = 1e3 * 3600 * 24 * 30; // 30 days

	const scheduleCheck = async () => {
		await checkUpdate();
		updateTimer = setTimeout(scheduleCheck, checkInterval);
	};

	if (!dbFile) {
		scheduleCheck();
	} else {
		updateTimer = setTimeout(scheduleCheck, checkInterval);
	}
};

// === IP query ===
export const ipInfo = (ip: string) => {
	if (!ip || !dbFile) return {};
	try {
		const r = ip2location.getAll(ip);
		return {
			short: r.countryShort || '',
			full: r.countryLong || '',
			region: r.region || '',
			city: r.city || ''
		};
	} catch {
		return {};
	}
};

export const ipInfoStr = (ip: string, cfCountry?: string) => {
	const geo = ipInfo(ip);
	let g0 = '';
	let g1 = '';
	if (geo && (geo.region || geo.short)) {
		g0 = geo.region || geo.short || '';
		if (geo.full !== g0 && geo.short) g1 = ',' + geo.short;
	} else if (cfCountry && cfCountry !== 'XX') {
		// Fallback to Cloudflare CF-IPCountry header when IP2Location DB unavailable
		g0 = cfCountry;
	}
	return g0 + g1;
};
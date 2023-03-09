import fs from 'fs';
import JSZip from 'jszip';
import * as https from 'https';
import { IP2Location } from 'ip2location-nodejs';
import { sys } from '$lib/server/index';
import path from 'path';
import { mkdir } from '$lib/server/utils';

const ip2location = new IP2Location();
const db_type = 'DB3';
const url = `https://www.ip2location.com/download/?token=$TOKEN&file=${db_type}LITEBINIPV6`;
const zip = new JSZip();
const maxSize = 1024 * 1024 * 50;

let cancel = new Function();
let curDownLoad = '';

async function update() {
	clearTimeout(t);
	const dir = sys.ipLiteDir;
	const tk = sys.ipLiteToken;
	if (!tk) return 0;
	const err = mkdir(dir);
	if (err) {
		console.log(err);
		return 0;
	}
	const name = `ip_${Date.now()}`;
	const latest = path.resolve(dir, name);
	let siz = 0;
	if (curDownLoad && curDownLoad === tk) return 0;
	else {
		cancel?.();
	}
	return await new Promise((resolve) => {
		curDownLoad = tk;
		const data = [] as Uint8Array[];
		const link = url.replace('$TOKEN', tk);
		downloading = 1;
		const req = https.get(link, (res) => {
			res.on('data', (d) => {
				siz += d.length;
				if (siz > maxSize) {
					req.destroy(new Error('max size limit'));
					return;
				}
				data.push(d);
			});
			res.on('error', (e) => {
				console.error(e);
				resolve(0);
			});
			res.on('end', () => {
				try {
					ip2location.close();
					fs.readdirSync(dir).forEach((a) => {
						if (/^ip_\d+$/.test(a)) {
							try {
								fs.unlinkSync(path.resolve(dir, a));
							} catch (e) {
								console.log('unlink error:', a, '\n', e?.toString());
							}
						}
					});
					zip
						.loadAsync(Buffer.concat(data))
						.then((result) => {
							return result
								.file(`IP2LOCATION-LITE-${db_type}.IPV6.BIN`)
								?.async('nodebuffer') as Promise<Buffer>;
						})
						.then((r) => {
							fs.writeFileSync(latest, r);
							load(latest);
							resolve(1);
						})
						.catch((e) => {
							console.log(e);
						});
				} catch (e) {
					resolve(0);
					console.log(e);
				}
			});
		});
		cancel = () => {
			curDownLoad = '';
			req.destroy(new Error('new task'));
		};
	}).finally(() => (downloading = 0));
}

let t: ReturnType<typeof setTimeout>;
let geoIp: typeof ip2location | null;
const load = (file?: string) => {
	if (!file) return;
	ip2location.close();
	ip2location.open(file);
	if (ip2location.loadBin()) {
		geoIp = ip2location;
	} else console.log('fail load bin!');
};
export const geoClose = () => {
	if (geoIp) {
		geoIp.close();
		geoIp = null;
		ip2location.close();
	}
};
let downloading = 0;
export const geoStatue = () => (downloading ? '-' : (geoIp && geoIp.getDatabaseVersion()) || '');
export const loadGeoDb = () => {
	const dir = sys.ipLiteDir;
	if (dir) {
		const next = 1e3 * 3600 * 24 * 14;
		let delay = 0;
		const err = mkdir(dir);
		if (err) {
			console.log(err);
		} else {
			const n = Date.now();
			const file = fs.readdirSync(dir).reduce((a, b) => {
				if (/^ip_\d+/.test(b)) {
					const c = +b.replace(/^ip_/, '');
					if (c < a) return c;
				}
				return a;
			}, n);
			if (file && file !== n) {
				load(path.resolve(dir, `ip_${file}`));
				delay = next - Date.now() + file;
			}
		}
		setTimeout(() => {
			update().finally(() => {
				t = setTimeout(update, next);
			});
		}, delay);
	}
};

export const ipInfo = (ip: string) => {
	if (!ip) return {};
	if (geoIp) {
		const r = geoIp.getAll(ip);
		return {
			short: r.countryShort,
			full: r.countryLong,
			region: r.region,
			city: r.city
		};
	}
	return {};
};

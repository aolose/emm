import uap from 'ua-parser-js';

type rqInf = {
	path: string;
	ip: string;
	os?: string;
	browser?: string;
	device?: string;
};
setInterval(() => {
	perHour.length = 0;
}, 1e3 * 3600);
const perHour: rqInf[] = [];
const collector = (ip: string, ua: string, path: string) => {
	const u = uap(ua);
	const { browser, os, device } = u;

	perHour.push({
		ip,
		path,
		os: os.name,
		device: device.type,
		browser: browser.name
	});
};

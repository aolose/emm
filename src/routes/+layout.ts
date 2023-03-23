import { saveCache, apiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { statueSys, status, h, navStore } from '$lib/store';
import type { headInfo } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import type { Page } from '@sveltejs/kit';
import { page } from '$app/stores';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { BeforeNavigate } from '@sveltejs/kit';
const cacheTime = 1e3 * 3600 * 24;
let pathname = '';
let routId = '';
const jump = async (nav?: BeforeNavigate) => {
	const path = nav?.to?.url.pathname || pathname;
	const adm = '/admin';
	const lg = '/login';
	const cfg = 'config';
	let rd = '';
	if (path === cfg && sys > 1) {
		rd = '/';
	} else if (stu && path === lg) {
		rd = adm;
		if (browser) {
			rd = sessionStorage.getItem('bk') || rd;
			sessionStorage.removeItem('bk');
		}
	} else if (!stu && path.startsWith(adm)) rd = lg;
	if (rd) {
		if (browser) {
			pathname = rd;
			if (nav) nav.cancel();
			return await goto(rd, { replaceState: true });
		} else throw redirect(307, rd);
	}
};

let loaded = 0;
type saveData = headInfo & { statue: number; sys: number };
let cacheData = {} as saveData;
let sys = 0;
let stu = 0;
navStore.subscribe(jump);

const ps = async (p: Page) => {
	routId = p.route?.id || '';
	pathname = p.url?.pathname || '';
};

const save = (a: saveData) => {
	cacheData = { ...cacheData, ...a };
	if (!loaded) return;
	saveCache('statue', undefined, cacheData, cacheTime);
};

const su = async (s: number) => {
	save({ statue: (stu = s) } as saveData);
	await jump();
};

if (browser) {
	page.subscribe(ps);
	status.subscribe(su);
}
export const load = apiLoad('statue', undefined, {
	cache: cacheTime,
	method: method.GET,
	done: async (d: unknown, ctx) => {
		loaded = 1;
		cacheData = d as headInfo & { statue: number; sys: number };
		pathname = (ctx as { url: URL }).url.pathname;
		sys = cacheData.sys;
		stu = cacheData.statue;
		h.update(a=>({...a,...cacheData}));
		if (browser) {
			statueSys.set(sys);
			status.set(stu);
		} else {
			await su(stu);
		}
	}
});

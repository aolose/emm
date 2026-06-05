import { saveCache, req } from '$lib/req';
import { setPwdSalt } from '$lib/utils';
import { method } from '$lib/enum';
import { statueSys, status, h, navStore } from '$lib/store';
import type { headInfo } from '$lib/types';
import { redirect, error } from '@sveltejs/kit';
import type { Page, LoadEvent, BeforeNavigate } from '@sveltejs/kit';
import { page } from '$app/stores';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
const cacheTime = 1e3 * 3600 * 24;
let pathname = '';
const jump = async (nav?: BeforeNavigate) => {
	const path = nav?.to?.url.pathname || pathname;
	const adm = '/admin';
	const lg = '/login';
	const cfg = '/config';
	let rd = '';
	if (path === cfg && sys === 9) {
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
		} else redirect(307, rd);
	}
};

let loaded = 0;
type saveData = headInfo & { statue: number; sys: number; pwdSalt?: string };
let cacheData = {} as saveData;
let sys = 0;
let stu = 0;
navStore.subscribe(jump);

const ps = async (p: Page) => {
	pathname = p.url?.pathname || '';
};

const save = (a: saveData) => {
	cacheData = { ...cacheData, ...a };
	if (!loaded) return;
	saveCache('statue', undefined, method.GET, cacheData, undefined, cacheTime);
};

const su = async (s: number) => {
	save({ statue: (stu = s) } as saveData);
	await jump();
};

if (browser) {
	page.subscribe(ps);
	status.subscribe(su);
}
export const load = async (event: LoadEvent) => {
	const { url, fetch, params } = event;
	const path = url.pathname;
	pathname = path;

	// On client-side, skip API call for non-admin pages after initial load.
	// Public browsing needs neither auth checks nor site-config updates.
	if (browser && loaded && !path.startsWith('/admin')) {
		return { p: params, d: cacheData };
	}

	let d: unknown;
	try {
		d = await req('statue', undefined, { fetch, method: method.GET, ctx: { url } });
	} catch (e: any) {
		if (e?.status >= 400) throw error(e.status, e?.body || 'Failed to load statue');
		throw e;
	}

	loaded = 1;
	cacheData = d as saveData;
	sys = cacheData.sys;
	stu = cacheData.statue;
	h.update((a) => ({ ...a, ...cacheData }));

	if (browser) {
		statueSys.set(sys);
		status.set(stu);
		if (cacheData.pwdSalt) setPwdSalt(cacheData.pwdSalt);
		if (!stu && path.startsWith('/admin')) {
			throw redirect(307, '/login');
		}
	} else {
		statueSys.set(sys);
		await su(stu);
	}

	return { p: params, d };
};

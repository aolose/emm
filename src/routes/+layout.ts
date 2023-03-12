import { saveCache, useApiLoad } from '$lib/req';
import { method } from '$lib/enum';
import { seo, statueSys, status } from '$lib/store';
import type { headInfo } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import type { Page } from '@sveltejs/kit';
import { page } from '$app/stores';
import { h } from './head';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

const jump = async () => {
	const adm = '/admin';
	const lg = '/login';
	const cfg = 'config';
	let rd = '';
	if (pathname === cfg && sys > 1) {
		rd = '/';
	} else if (stu && pathname === lg) rd = adm;
	else if (!stu && pathname.startsWith(adm)) rd = lg;
	if (rd) {
		if (browser) {
			pathname = rd;
			await goto(rd, { replaceState: true });
		} else throw redirect(307, rd);
	}
};

type saveData = headInfo & { statue: number; sys: number };
let cacheData = {} as saveData;
let sys = 0;
let stu = 0;

const cacheTime = 1e3 * 3600 * 24;
let pathname = '';
let routId = '';

const ps = (p: Page) => {
	routId = p.route?.id || '';
	pathname = p.url?.pathname || '';
};
const ss = (a: headInfo) => {
	const cur = a[routId] as headInfo;
	const { title, key, desc } = { ...a, ...cur } as { title: string; key: string; desc: string };
	h.set({ title, key, desc });
};

const save = (a: saveData) => {
	cacheData = { ...cacheData, ...a };
	saveCache('statue', undefined, cacheData, cacheTime);
};

const su = async (s: number) => {
	save({ statue: (stu = s) } as saveData);
	await jump();
};

if (browser) {
	page.subscribe(ps);
	seo.subscribe(ss);
	status.subscribe(su);
}

export const load = useApiLoad('statue', undefined, {
	cache: cacheTime,
	method: method.GET,
	done(d: unknown, ctx) {
		cacheData = d as headInfo & { statue: number; sys: number };
		pathname = (ctx as { url: URL }).url.pathname;
		sys = cacheData.sys;
		stu = cacheData.statue;
		if (browser) {
			seo.update((a) => ({ ...a, ...cacheData }));
			statueSys.set(sys);
			status.set(stu);
		} else {
			ss(cacheData);
			su(stu);
		}
	}
});

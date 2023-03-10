import { saveCache, useApi } from '$lib/req';
import { method } from '$lib/enum';
import { seo, statueSys, status } from '$lib/store';
import type { headInfo } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import type { Page } from '@sveltejs/kit';
import { page } from '$app/stores';
import { h } from './head';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';

const jump = () => {
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
			console.log(get(page));
			pathname = rd;
			goto(rd, { replaceState: true });
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

const su = (s: number) => {
	save({ statue: (stu = s) } as saveData);
	jump();
};

if (browser) {
	page.subscribe(ps);
	seo.subscribe(ss);
	statueSys.subscribe((a) => save({ sys: (sys = a) } as saveData));
	status.subscribe(su);
}

export const load = useApi('statue', undefined, {
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

import { mock } from 'bun:test';

// Mock SvelteKit virtual modules for all tests
mock.module('$app/navigation', () => ({
	goto: () => Promise.resolve(),
}));
mock.module('$app/environment', () => ({
	browser: false,
}));
mock.module('$app/stores', () => ({
	page: {
		subscribe: (fn: Function) => fn({ url: { pathname: '/' } }),
	},
}));

// Svelte 5 server-side store exports differ from client
mock.module('svelte/store', () => {
	let val: any;
	const writable = (init: any) => ({
		set: (v: any) => { val = v; },
		update: (fn: Function) => { val = fn(val); },
		subscribe: (fn: Function) => { fn(val || init); return () => {}; },
	});
	const readable = (init: any, start?: Function) => writable(init);
	const derived = (stores: any, fn: Function) => {
		const s = Array.isArray(stores) ? stores : [stores];
		const vals = s.map((st: any) => { let v: any; st.subscribe((vv: any) => v = vv)(); return v; });
		return writable(fn(...vals));
	};
	const get = (s: any) => {
		let v: any;
		s.subscribe((vv: any) => v = vv)();
		return v;
	};
	return { writable, readable, derived, get };
});

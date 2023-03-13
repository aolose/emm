import { get } from 'svelte/store';
import { browser } from '$app/environment';
import type { SvelteComponent } from 'svelte';
import { elmCpm, elmProps, elmTmpl } from '$lib/store';
export const regElement = (tag: string, cpm: SvelteComponent) => {
	if (!browser || elmCpm[tag] || customElements.get(tag)) return;
	elmCpm[tag] = cpm;
	const a = class extends HTMLElement {
		constructor() {
			super();
			const p: { [key: string]: string } = {};
			let k = tag + '@';
			for (const { name, value } of this.attributes) {
				k += name + (p[name] = value);
			}
			elmProps.update((o) => ({ ...o, [k]: p }));
			const render = (a: { [key: string]: HTMLElement }) => {
				const c = a[k];
				if (c instanceof HTMLElement) {
					this.innerHTML = c.innerHTML;
				}
			};
			elmTmpl.subscribe(render);
			render(get(elmTmpl));
		}
	};
	customElements.define(tag, a);
};

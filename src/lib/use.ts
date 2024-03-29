import { page } from '$app/stores';
import type Clipboard from 'clipboard';
export const act = (node: HTMLAnchorElement, exact = true) => {
	const cls = 'act';
	const u = page.subscribe((p) => {
		const target = node.getAttribute('href') || '';
		const cur = p.url.pathname;
		const match = exact ? cur === target : cur.startsWith(target);
		if (match) {
			node.classList.add(cls);
		} else {
			node.classList.remove(cls);
		}
	});
	return {
		destroy: u
	};
};

export const imageViewer = async (node: HTMLElement) => {
	const Viewer = (await import('viewerjs')).default;
	Viewer.setDefaults({
		button: true,
		navbar: false,
		title: false,
		toolbar: false,
		keyboard: false,
		minWidth: 400,
		loop: false,
		minHeight: 200,
		minZoomRatio: 0.1
	});

	const t = setTimeout(() => new Viewer(node), 1e3);
	return {
		destroy: () => clearTimeout(t)
	};
};

export const inner = (node: HTMLElement, child: unknown) => {
	const getEl = (child: unknown) => {
		let el: HTMLElement | Text;
		if (child instanceof HTMLElement) {
			el = child;
		} else el = document.createTextNode(child as string);
		return el;
	};
	let el = getEl(child);
	if (child) node.appendChild(el);
	return {
		update(child: unknown) {
			if (el && node.contains(el)) {
				const e = getEl(child);
				el.replaceWith(e);
				el = e;
			} else {
				el = node.appendChild(getEl(child));
			}
		}
	};
};

export async function clipboard(n: HTMLElement, cb: () => void) {
	const C = (await import('clipboard')).default;
	let c: Clipboard;
	const r = (n: HTMLElement, cb: () => void) => {
		if (c) c.destroy();
		c = new C(n, {
			text(target) {
				return target.getAttribute('data-text') || '';
			}
		});
		c.on('success', cb);
	};
	r(n, cb);
	return {
		update: r,
		destroy() {
			if (c) c.destroy();
		}
	};
}

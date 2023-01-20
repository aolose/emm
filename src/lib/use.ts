import {page} from '$app/stores';

export const act = (node: HTMLAnchorElement, exact = true) => {
    const cls = 'act'
    const u = page.subscribe((p) => {
        const target = node.getAttribute('href') || ''
        const cur = p.url.pathname
        const match = exact ? cur === target : cur.startsWith(target)
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

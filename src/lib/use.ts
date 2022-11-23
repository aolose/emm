import {page} from '$app/stores'

export const act = (node: HTMLAnchorElement, cls = 'act') => {
    const u = page.subscribe(p => {
        if (p.url.pathname === node.getAttribute('href')) {
            node.classList.add(cls)
        } else {
            node.classList.remove(cls)
        }
    })
    return {
        destroy: u
    }
}
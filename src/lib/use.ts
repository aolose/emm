import {page} from '$app/stores';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';

Viewer.setDefaults({
    button: true,
    navbar: false,
    title: false,
    toolbar: false,
    keyboard: false,
    minWidth: 400,
    loop: false,
    minHeight: 200,
    minZoomRatio: 0.1,
})
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


export const imageViewer = (node: HTMLElement) => {
    const t = setTimeout(()=>new Viewer(node),1e3)
    return {
        destroy:()=>clearTimeout(t)
    }
}
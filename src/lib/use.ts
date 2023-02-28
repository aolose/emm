import { page } from "$app/stores";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";
import hjs from "highlight.js/lib/core";
import "highlight.js/styles/github-dark.css";
import { delay } from "$lib/utils";

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
export const act = (node: HTMLAnchorElement, exact = true) => {
  const cls = "act";
  const u = page.subscribe((p) => {
    const target = node.getAttribute("href") || "";
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


export const imageViewer = (node: HTMLElement) => {
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
export const highlight = delay(async (n: HTMLElement) => {
  const r = new Set<string>();
  for (const a of n.querySelectorAll("code")) {
    let lang = (a.className || "").replace("language-", "") || "common";
    a.setAttribute('name',lang)
    let reg;
    if (!r.has(lang)) {
      switch (lang) {
        case "js":
          lang = "javascript";
          reg = await import("highlight.js/lib/languages/javascript");
          break;
        case "css":
          reg = await import("highlight.js/lib/languages/css");
          break;
        case "scss":
          reg = await import("highlight.js/lib/languages/scss");
          break;
        case "yaml":
          reg = await import("highlight.js/lib/languages/yaml");
          break;
        case "json":
          reg = await import("highlight.js/lib/languages/json");
          break;
        case "xml":
        case "html":
          reg = await import("highlight.js/lib/languages/xml");
          break;
        case "go":
          reg = await import("highlight.js/lib/languages/go");
          break;
        case "java":
          reg = await import("highlight.js/lib/languages/java");
          break;
        case "nginx":
          reg = await import("highlight.js/lib/languages/nginx");
          break;
      }
      if(reg){
        hjs.registerLanguage(lang,reg.default)
      }
    }
    a.innerHTML = hjs.highlight(a.innerHTML, { language: lang }).value
  }
},60);
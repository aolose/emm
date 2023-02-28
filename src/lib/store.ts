import {writable, get, readable} from 'svelte/store';
import {Upload} from 'upload';
import Compressor from 'compressorjs';
import type {
    fView, fileInfo, fInfo, Timer,
    fileSelectCfg, cfOpt, curPost
} from "$lib/types";

import {randNum} from "$lib/utils";
import type {Require} from "$lib/server/model";

const user = writable({
    token: 'test'
});

const confirmCfg = {} as cfOpt
const fileManagerCfg = {} as fileSelectCfg

export const fileManagerStore = writable(fileManagerCfg)
export const confirmStore = writable({...confirmCfg})

export const selectFile = (limit = 0,type='') => {
    return new Promise((resolve, reject) => {
        fileManagerStore.set({
            limit,
            type,
            show: true, resolve, reject
        })
    }).catch(() => void 0)
}

export const confirm = (msg: string, ok = 'ok', cancel = 'cancel') => {
    return new Promise((resolve, reject) => {
        const cfg = {...confirmCfg, ok, cancel, resolve, reject, show: true, text: msg}
        confirmStore.set(cfg)
    }).catch(() => void 0)
}


export const getProgress = (f: fileInfo) => {
    let b = 0;
    return readable(f.up, (set) => {
        const c = requestAnimationFrame(() => {
            const up = f.up;
            if (b !== up) {
                b = up;
                set(up);
            }
        });
        return () => {
            cancelAnimationFrame(c);
        };
    });
};
export const upFiles = writable([] as fileInfo[]);
const upDonSet = new Set<number>()
export const filesUpload = (files: FileList | File[], cb?: (f: fView) => void) => {
    for (const f of files) {
        const t = f.type;
        const o: fInfo = {
            name: f.name,
            file: f
        };
        if (t.startsWith('image/') && f.size > 1000) {
            new Compressor(f, {
                quality: 0.8,
                mimeType: 'image/webp',
                success(file: File | Blob) {
                    o.file = file;
                    up(o, cb);
                },
                error(e) {
                    console.error(e)
                    up(o, cb);
                }
            });
        } else up(o, cb);
    }
};

let cTimer: Timer
const up = (info: fInfo, cb?: (f: fView) => void) => {
    const token = get(user).token;
    const f = new FormData();
    Object.entries(info).forEach(([k, v]) => f.set(k, v));
    const up = new Upload({
        url: '/api/up',
        form: f,
        headers: {
            auth: token
        }
    });
    const id = -randNum();
    const clean = () => {
        upDonSet.add(id)
        clearTimeout(cTimer)
        cTimer = setTimeout(() => {
            upFiles.update((u) =>
                u.filter((u) => !upDonSet.delete(u.id)));
        }, 1e3)
    };
    const v = {
        id,
        name: info.name,
        type: info.file.type,
        size: info.file.size,
        up: 0,
        abort() {
            clean();
            up.abort();
        }
    };

    upFiles.update((u) => u.concat(v));
    up.on('progress', (p) => {
        p = p * 100;
        v.up = p;
        if (p === 100) clean();
    });
    up.upload().then(({data}) => {
        if (data && cb) {
            cb({
                id: +data,
                size: info.file.size,
                name: info.name,
                type: info.file.type
            })
        }
    });
    return v;
};
export const status = writable(0)
export const allowCodeLogin = writable(0)
export const originPost = writable({} as curPost)
export const editPost = writable({} as curPost)

export const patchedTag = writable({
    ver:0,
    tags:[] as string[]
})
export const posts = writable([] as curPost[])
export const setting = writable(null)
export const saveNow = writable(0)

editPost.subscribe(p => {
    if (!p._ && !p.id) return
    let ls = get(posts)
    const c = ls.findIndex(o => {
        return (p._ && o._ === p._) || (p.id && p.id === o.id)
    })
    if (c !== -1) {
        ls[c] = {...ls[c], ...p}
    } else ls = [p].concat(ls)
    posts.set([...ls])
})

export const msg = writable('');

export const expand = writable(0)
import {writable, get, readable} from 'svelte/store';
import {Upload} from 'upload';
import Compressor from 'compressorjs';
import type {fView} from "$lib/types";
import {randNum} from "$lib/utils";

const user = writable({
    token: 'test'
});

type fileSelectCfg = {
    show?: boolean,
    limit?: number,
    resolve?: (v: unknown) => void,
    reject?: (v: unknown) => void,
}

type cfOpt = {
    show: boolean,
    text?: string,
    ok?: string,
    cancel?: string,
    resolve?: (v: unknown) => void,
    reject?: (v: unknown) => void,
}
const confirmCfg = {} as cfOpt
const fileManagerCfg = {} as fileSelectCfg

export const fileManagerStore = writable(fileManagerCfg)
export const confirmStore = writable({...confirmCfg})

export const selectFile = (limit = 0) => {
    return new Promise((resolve, reject) => {
        fileManagerStore.set({
            limit,
            show: true, resolve, reject
        })
    })
}

export const confirm = (msg: string, ok = 'ok', cancel = 'cancel') => {
    return new Promise((resolve, reject) => {
        const cfg = {...confirmCfg, ok, cancel, resolve, reject, show: true, text: msg}
        confirmStore.set(cfg)
    })
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

type fileInfo = {
    id: number;
    size: number;
    name: string;
    type: string;
    up: number;
    abort: () => void;
};
export const upFiles = writable([] as fileInfo[]);
const upDonSet = new Set<number>()
export const filesUpload = (files: FileList, cb?: (f: fView) => void) => {
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

type fInfo = {
    name: string;
    file: Blob;
};
type Timer = ReturnType<typeof setTimeout>
let cTimer: Timer
const up = (info: fInfo, cb?: (f: fView) => void) => {
    const token = get(user).token;
    if (!token) return;
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

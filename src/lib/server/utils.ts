import {NULL} from './enum';
import {dataType} from '../enum';
import type {ApiData} from '../types';
import {
    encryptType,
    contentType,
    encrypt,
    parseBody,
    randNum,
    decryptReq,
    encryptHeader,
    getKINums,
    data2Buf
} from '../utils';
import {keyPool} from './crypto';

export const is_dev = process.env.NODE_ENV !== 'production';


export const sqlVal = (values: unknown[]) => values.map(a => {
    const t = typeof a
    switch (t) {
        case "boolean":
            return +(a as boolean)
        case "object":
            if (a instanceof Date) return a.getTime()
    }
    return a
})

export function noNullKeyValues(o: object) {
    const keys = [] as string[];
    const values = [] as unknown[];
    const {TEXT, INT, DATE} = NULL;
    Object.entries(o).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
            const t = v.constructor.name;
            switch (t) {
                case 'String':
                    if (v === TEXT) return;
                    break;
                case 'Number':
                    if (v === INT) return;
                    break;
                case 'Date':
                    if (v.getTime() === DATE.getTime()) return;
                    break;
            }
            keys.push(k);
            values.push(v);
        }
    });
    return [keys, values];
}

function now() {
    return `[${new Date().toLocaleString()}]`;
}

export const Log = {
    debug(label: string, ...params: unknown[]) {
        if (is_dev)
            console.log(now(), label, ...params);
    },
    info(label: string, ...params: unknown[]) {
        console.log(now(), label, ...params);
    },
    warn(label: string, ...params: unknown[]) {
        console.warn(now(), label, ...params);
    },
    error(label: string, ...params: unknown[]) {
        console.error(now(), label, ...params);
    }
};

export const val = (a: unknown) => {
    if (a === undefined || a === null) return null;
    const t = a.constructor.name;
    switch (t) {
        case 'String':
            if (a === NULL.TEXT) return null;
            break;
        case 'Number':
            if (a === NULL.INT) return null;
            break;
        case 'Date':
            if (a === NULL.DATE) return null;
            break;
    }
    return a;
};

export const resp = (body: ApiData, code = 200) => {
    const [tp, data] = parseBody(body);
    return new Response(data as BodyInit, {
        status: code,
        headers: new Headers({
            [contentType]: tp
        })
    });
};

export const getShareKey = (req: Request) => {
    const enc = encryptHeader(req);
    if (enc) {
        const [num] = getKINums(enc);
        return keyPool.get(num)?.[0];
    }
};

export const getReqJson = async (req: Request) => {
    const shareKey = getShareKey(req);
    const decBuf = shareKey && (await decryptReq(req, shareKey, true));
    if (decBuf) return decBuf.json();
    return await req.json();
};

export const encryptResp = async (params: ApiData, keyNum: number, code = 200) => {
    const sk = keyPool.get(keyNum)?.[0];
    if (sk) {
        const [tp, data] = parseBody(params);
        if (data) {
            const num = randNum();
            const headers = new Headers({
                [contentType]: dataType.binary,
                [encryptType]: tp,
                encrypt: num.toString(36)
            });
            const bs = data2Buf(data);
            if (bs) {
                const buf = await encrypt(bs, num, sk);
                return new Response(buf, {
                    status: code,
                    headers
                });
            }
        }
    }
    return resp('', 403);
};

import {req} from "./req";
import {dataType} from "./enum";
import type {RequestEvent} from "@sveltejs/kit";

const {subtle} = crypto

export const buf2Str = (buf: ArrayBuffer) => {
    let out, i, c;
    let char2, char3;

    out = "";
    const array = new Uint8Array(buf)
    const len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }
    return out;
}

export const algorithm = {
    name: 'ECDH',
    namedCurve: 'P-256'
}
const algorithm_AES_CBC = {
    name: 'AES-CBC',
    length: 256,
}

let genKey: CryptoKeyPair
let shareKey: CryptoKey
let serectNum: number


export async function splitResult(buf: unknown) {
    if (buf instanceof ArrayBuffer) {
        const a = new Uint8Array(buf)
        const b = a.slice(0, 2)
        const c = a.slice(2)
        serectNum = b[0] << 8 + b[1]
        const srvPuk = await subtle.importKey('raw', c.buffer, algorithm, true, [])
        shareKey = await genShareKey(srvPuk, genKey.privateKey)
    }
}


async function encrypt(data: BufferSource) {
    return await subtle.encrypt(algorithm_AES_CBC, shareKey, data)
}

export const genPubKey = async () => {
    const {subtle} = crypto
    genKey = await subtle.generateKey(
        algorithm,
        false,
        ['deriveKey'])
    return await subtle.exportKey('raw', genKey.publicKey)
}

export const toBodyBuf = async (o?: object | string | number, encrypt = true) => {
    if (!o) return o;
    const type = typeof o
    if (type === 'number') return o
    let buf: ArrayBuffer
    if (!(o instanceof ArrayBuffer)) {
        let str = o
        if (type === 'object') str = JSON.stringify(o)
        const arr = [str] as BlobPart[]
        buf = await new Blob(arr).arrayBuffer()
    } else buf = o
    if (!encrypt || !shareKey) return buf;
    return new Blob([])
}


export const parseBuf = async (buf: ArrayBuffer, encrypt: boolean) => {
    let raw = buf
    if (encrypt) raw = await subtle.decrypt(algorithm_AES_CBC, shareKey, buf)
    const txt = buf2Str(raw)
    return {
        json() {
            return JSON.parse(txt)
        },
        string() {
            return txt
        },
        buffer() {
            return buf
        }
    }
}


export const genShareKey = async (pub: CryptoKey, pri: CryptoKey) => {
    return await subtle.deriveKey({
        ...algorithm,
        public: pub
    }, pri, algorithm_AES_CBC, false, ['encrypt', 'decrypt'])
}

export const syncShareKey = async () => {
    if (shareKey) return;
    const pub = await genPubKey()
    const r = await req('hello', pub, {type: dataType.buffer, encrypt: false})
    await splitResult(r)
}


export function auth(event: RequestEvent): Response | void {
    // todo
}

export const combineResult = (id: number, pk: ArrayBuffer) => {
    const bf = new Uint8Array(pk)
    const nbf = new Uint8Array(pk.byteLength + 2)
    nbf[0] = id >> 8
    nbf[1] = id & 0xff
    nbf.set(bf, 2)
    return nbf.buffer
}

export const getResJson = async (res: Request) => {
    const buf = await res.arrayBuffer()
    const r = await parseBuf(buf, true)
    return r.json()
}



const dataTypes=[
    'application/json',
    'text/pain',
    'application/octet-stream',
]

function contentType(type: dataType) {
    return {
        'Content-Type': dataTypes[type]
    }
}

export const jsonHeader = new Headers(contentType(dataType.json))
export const textHeader = new Headers(contentType(dataType.text))

export const getHeaderDataType = (h:Headers)=>{
    const t = h.get('Content-Type')?.replace(/;.*/,'')
    if(t)return dataTypes.indexOf(t)
}

export const errorResp = (code: number, msg: string) => {
    return new Response(msg, {
        status: code,
        headers:textHeader
    })
}
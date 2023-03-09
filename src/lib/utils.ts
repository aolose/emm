import { req } from "./req";
import { contentType, dataType, encryptIv, encTypeIndex, getIndexType } from "./enum";
import type { ApiData, ApiBodyData, fView, Model, Obj, Timer, reqOption, func } from "./types";
import pinyin from "tiny-pinyin";
import { marked } from "marked";
import { convert } from "html-to-text";
import { goto } from "$app/navigation";
import type { reqParams } from "./types";
import JSZip from "jszip";
import { confirm, statueSys } from "$lib/store";
import { get } from "svelte/store";

const { subtle } = crypto;
let genKey: CryptoKeyPair;
export let shareKey: CryptoKey | undefined;
export let keyNum: number;
export const maxKeyNum = 0xffff;
export const padNum = maxKeyNum.toString(36).length;
export const algorithm = {
  name: "ECDH",
  namedCurve: "P-256"
};
const algorithm_AES_CBC = {
  name: "AES-CBC",
  length: 256
};

export async function splitResult(buf: unknown) {
  if (buf instanceof ArrayBuffer) {
    const a = new Uint8Array(buf);
    const b = a.slice(0, 2);
    const c = a.slice(2);
    keyNum = (b[0] << 8) + b[1];
    const srvPuk = await subtle.importKey("raw", c.buffer, algorithm, true, []);
    shareKey = await genShareKey(srvPuk, genKey.privateKey);
    shareExpire = Date.now() + shareKeyExpire;
    saveKey().then();
  }
}

export const encrypt = async (data: BufferSource, num: number, shareKey: CryptoKey) =>
  await subtle.encrypt(algorithm_AES_CBC_Gen(num), shareKey, data);

export const genPubKey = async () => {
  const { subtle } = crypto;
  genKey = await subtle.generateKey(algorithm, false, ["deriveKey"]);
  return await subtle.exportKey("raw", genKey.publicKey);
};

export const decryptBuf = async (buf: ArrayBuffer, encrypt: number, key?: CryptoKey) => {
  let raw = buf;
  if (encrypt && key) raw = await subtle.decrypt(algorithm_AES_CBC_Gen(encrypt), key, buf);
  const txt = buf2Str(raw);
  return {
    json() {
      return JSON.parse(txt);
    },
    text() {
      return txt;
    },
    buffer() {
      return buf;
    }
  };
};

const shareKeyUsage = ["encrypt", "decrypt"] as KeyUsage[];
export const genShareKey = async (pub: CryptoKey, pri: CryptoKey) => {
  return await subtle.deriveKey(
    {
      ...algorithm,
      public: pub
    },
    pri,
    algorithm_AES_CBC,
    true,
    shareKeyUsage
  );
};

export const shareKeyExpire = 1e3 * 20;
const skName = "sk";
let shareExpire = 0;
const loadKey = async () => {
  const n = Date.now();
  if (shareKey && shareExpire > n) return;
  else shareKey = undefined;
  try {
    const [k, exp, pr] = (sessionStorage.getItem(skName) || "").split(",");
    if (+exp > n) {
      const buf = data2Buf(pr);
      if (buf) {
        shareKey = await subtle.importKey("raw", buf, algorithm_AES_CBC, true, shareKeyUsage);
        keyNum = +k;
      }
    }
  } catch (e) {
    console.error(e);
    // ignore
  }
};

const saveKey = async () => {
  if (shareKey) {
    const buf = await subtle.exportKey("raw", shareKey);
    sessionStorage.setItem(skName, [keyNum, shareExpire, buf2Str(buf)].join());
  }
};

export const syncShareKey = async () => {
  await loadKey();
  if (shareKey) return;
  const pub = await genPubKey();
  const r = await req("hello", pub);
  await splitResult(r);
};

export const getKINums = (ehd: string) => {
  return [parseInt(ehd.slice(0, padNum), 36) - maxKeyNum, parseInt(ehd.slice(padNum), 36)];
};

export const decryptReq = async (req: Request, shareKey: CryptoKey, server: boolean) => {
  const ehd = encryptHeader(req);
  if (ehd) {
    let viNum: number;
    if (!server) {
      viNum = parseInt(ehd, 36);
    } else {
      const ki = getKINums(ehd);
      viNum = ki[1];
    }
    if (shareKey) {
      const buf = await req.arrayBuffer();
      return await decryptBuf(buf, viNum, shareKey);
    }
  }
};

export const getHeaderDataType = (h: Headers) => {
  let t = h.get(contentType);
  if (h.has(encryptIv)) {
    t = getIndexType(h.get(encTypeIndex));
  }
  return t?.replace(/;.*/, "");
};

export const parseBody = (data: ApiData) => {
  const t = typeof data;
  let tp = dataType.text;
  switch (t) {
    case "boolean":
    case "number":
      tp = dataType.json;
      break;
    case "object":
      if (data && /ArrayBuffer|Blob|File|(Uint16|Uint8)Array/g.test(data.constructor.name)) {
        tp = dataType.binary;
        break;
      }
      data = JSON.stringify(data);
      tp = dataType.json;
  }
  return [tp, data] as [string, ApiBodyData];
};

export const buf2Str = (buf: ArrayBuffer) => {
  const bv = new Uint16Array(buf);
  let n = bv.length;
  let s = "";
  while (n--) s = String.fromCharCode(bv[n]) + s;
  return s;
};
const buf2x = (buf: ArrayBuffer) => {
  const bv = new Uint8Array(buf);
  let n = bv.length;
  let s = "";
  const k = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+=!@#$%^&*<>?:_-|~(){}[],.";
  const t = k.length;
  while (n) {
    const v = [0, 0, 0, 0];
    let x = 4;
    while (x && n) {
      v[--x] = bv[--n];
    }
    let m = v[3] + (v[2] << 8) + (v[1] << 16) + ((v[0] << 24) >>> 0);
    while (m >= t) {
      const l = m % t;
      s += k[l];
      m = (m - l) / t;
    }
    s += k[m];
  }
  return s;
};

export const buf2Num = (buf: ArrayBuffer) => {
  const bv = new Uint8Array(buf);
  return bv.reduce((a, b, c) => {
    return a + (b << (8 * c));
  }, 0);
};

export const data2Buf = (data: ApiBodyData): ArrayBuffer | undefined => {
  if (data !== undefined) {
    const name = data.constructor.name;
    if (name === "ArrayBuffer") return data as ArrayBuffer;
    if (name === "Number") {
      let n = data as number;
      const a = [n & 0xff];
      while (n >= 0xff) a.push((n = n >>> 8) & 0xff);
      return new Uint8Array(a).buffer;
    }
    if (name === "String") {
      const d = data as string;
      let n = d.length;
      const buf = new ArrayBuffer(n * 2);
      const bfv = new Uint16Array(buf);
      while (n--) {
        bfv[n] = d.charCodeAt(n);
      }
      return buf;
    }
  }
};

export const randNum = (n?: number) => Math.floor(Date.now() * ((n || 0) + Math.random()));
export const randStr = (str: string) => {
  const m = str.length;
  let l = m;
  let w = "";
  const s = new Set();

  while (l--) {
    let a = Math.floor(Math.random() * m);
    while (s.has(a)) a = (a + 1) % m;
    s.add(a);
    w += str[a];
  }
  return w;
};

export const fetchOpt = async (o?: object | string | number, encrypted = false, cfg?: reqOption) => {
  const headers = cfg?.headers || new Headers();
  const num = randNum();
  let [tp, data] = parseBody(o);
  if (encrypted && data !== undefined) {
    tp = dataType.binary;
    headers.set(encryptIv, (maxKeyNum + keyNum).toString(36) + num.toString(36));
    const buf = data2Buf(data);
    if (buf) data = shareKey && (await encrypt(buf, num, shareKey));
  }
  headers.set(contentType, tp);
  const r = {
    headers
  } as { body?: BodyInit };
  if (data) r.body = data as BodyInit;
  return r;
};

export const body2query = (params: reqParams) => {
  const t = Object.prototype.toString.call(params).replace(/\[object |]/g, "");
  if (t === "Object") {
    return Object.entries(params as object).map(([a, b]) => `${a}=${encodeURI(b)}`).join("&");
  }
  if (typeof params === "object") return JSON.stringify(params);
  return params;
};

export const ivGen = (num: number) => {
  let n = 16;
  const a = new Uint8Array(n);
  while (n--) {
    a[n] = Math.floor((0xffff * Math.abs(Math.cos(((num / (n + 1)) % Math.PI) / Math.PI))) & 0xff);
  }
  return a.buffer;
};

const algorithm_AES_CBC_Gen = (n: number) => {
  return {
    ...algorithm_AES_CBC,
    iv: ivGen(n)
  };
};

export const encryptHeader = (req: { headers: Headers }) => req.headers.get(encryptIv);

export const hasOwnProperty = (target: object, p: string) =>
  Object.prototype.hasOwnProperty.call(target, p);

export const delay = (fn: (...params: never[]) => void, ms = 0) => {
  let timer: number;
  return (...params: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms, ...params);
  };
};

export const filter = <T extends object>(o: Obj<T>, keys: (keyof T)[], nullAble = true) => {
  if (!o) return o;
  o = { ...o };
  const limit = new Set(keys);
  const objKeys = new Set<keyof T>(Object.keys(o) as (keyof T)[]);
  for (const k of objKeys) {
    if (limit.size) {
      if (!limit.has(k)) {
        delete o[k];
      }
    }
    const v = o[k];
    if (nullAble || v !== undefined && v !== null) {
      continue;
    }
    delete o[k];
  }
  return o;
};

export const arrFilter = <T extends Model>(o: T[], keys: (keyof T)[], nullAble = true) => {
  return o.map(v => filter(v, keys, nullAble));
};

export const getExt = (f: fView) => {
  if (!f) return;
  const t = f.type.split("/")[1];
  if (t) {
    const match = (/^(x-)?([a-z0-9]+)/.exec(t) || [])[2];
    if (match) return match.toString();
  }
  const d = f.name.lastIndexOf(".");
  return f.name.substring(d);
};


export function fileSize(size: number) {
  const m = ["B", "KB", "MB", "GB"];
  let n = 0;
  while (size > 512 && n < 3) {
    size = size / 1024;
    n++;
  }
  return size.toFixed(1) + m[n];
}

export function createUrl(f: fView | File) {
  if (f instanceof File) {
    return URL.createObjectURL(f as File);
  }
  return `/res/${f.id}`;
}

export function createFileMd(f: fView | File, u = "") {
  const { name, size, type } = f;
  if (!u) u = createUrl(f);
  if (type.startsWith("image/")) {
    return `![${name}](${u})`;
  }
  if (type.startsWith("audio/")) {
    return `<label class="x-audio">${name}<audio controls><source src="${u}" type="${type}"></audio></label>`;
  }
  if (type.startsWith("video/")) {
    return `<label class="x-video">${name}<video controls><source src="${u}" type="${type}"></video></label>`;
  }
  return `<a class="x-file" download href="${u}"><p>${name}</p><span>${fileSize(size)}</span><i class="icon i-down"></i></a>`;
}

export function file2Md(f: fView[] | File[]) {
  const s = [] as string[];
  f.forEach((o) => {
    s.push(createFileMd(o));
  });
  return s.join("\n");
}

const equal = (a: unknown, b: unknown) => {
  const ta = typeof a;
  const tb = typeof b;
  if (ta === tb) {
    if (ta === "object") return JSON.stringify(a) === JSON.stringify(b);
    return a === b;
  }
  return false;
};

export function diffObj<T extends object>(origin: T, change: T) {
  if (!change || !origin) return change;
  const d = {} as T;
  let ch = 0;
  const s = new Set(Object.keys(origin));
  for (const [a, b] of Object.entries(change)) {
    if (!equal(origin[a as keyof T], b) && b !== undefined) {
      d[a as keyof T] = b;
      ch = 1;
      s.delete(a);
    }
  }
  if (ch) return d;
}

export function slugGen(title: string) {
  return pinyin.convertToPinyin(title, "", true).replace(/ /, "-");
}

let _id = 0;

export function idGen() {
  return `_${_id++}`;
}

export async function enc(str: string) {
  const vi = `2321aSDWas!@#$`;
  const d = data2Buf(str + vi) || new Uint8Array([]);
  return buf2x(await subtle.digest("sha-256", d));
}

export function goBack(root = "/posts") {
  if (sessionStorage.hasBack) history.go(-1);
  else return goto("/posts", { replaceState: true });
}

export const time = (value?: number) => {
  if (!value) return "";
  const d = new Date(value);
  if (!d || !d.getTime()) return "";
  return new Intl.DateTimeFormat("en-GB", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(d);
};

export const hds2Str = (hs: Headers | [string, string][]) => {
  const h = [];
  for (const [k, v] of hs) {
    if (k) h.push(`${k}:${v.replace(/\n/g, "")}`);
  }
  return h.join("\n");
};
export const trim = (a?: string, double = false) => typeof a === "string" ?
  double ? a.replace(/^\s+|\s{2,}$/g, "")
    : a.replace(/^\s+|\s+$/g, "") : a;
export const str2Hds = (str: string) => {
  const v: [string, string][] = [];
  str.split("\n").forEach(a => {
    const u = a.match(/^(.*?):(.*)$/);
    if (u) {
      const x = u[1].replace(/[^a-z0-9-_]/ig, "");
      if (x) v.push([x, trim(u[2]) || ""]);
    }
  });
  return v;
};

export const upDownScroller = (fn: (a: number) => void) => {
  let e = 0, t: Element;
  let stop = 0;
  let a = 0;
  let tm: Timer;
  return function(x: Event) {
    const tr = x.target as Element;
    if (tr === t) {
      const v = t.scrollTop - e;
      if (Math.abs(v) > 10) {
        const z = v > 0 ? 1 : 0;
        if (z !== a && !stop) {
          a = z;
          fn(z);
          stop = 1;
          clearTimeout(tm);
          tm = setTimeout(() => stop = 0, 300);
        }
        e = t.scrollTop;
      }
    } else {
      t = tr;
      e = t.scrollTop;
    }
  };
};


const colors = [
  "#667c85",
  "#a47e67",
  "#274C77",
  "#9d8d72",
  "#6096BA",
  "#8c8c7e",
  "#8B8C89",
  "#014F86",
  "#577573",
  "#2C7DA0",
  "#A5A58D",
  "#5C677D",
  "#4281A4"
];

export const adminRedirect = (s: number, path: string) => {
  const adm = "/admin";
  const lg = "/login";
  const cfg  ='config'
  if(path===cfg&&get(statueSys)>1){
    return '/'
  }
  if (s && path === lg) return adm;
  if (!s && path.startsWith(adm)) return lg;
};
export const getColor = (a: number | string, opacity = 1) => {
  const d = colors.length;
  if (typeof a === "string") {
    let e = 0;
    let l = a.length;
    while (l--) e += (a.codePointAt(l) || 0) % d;
    a = e;
  }
  a = Math.floor(a);
  const c = colors[a % d];
  if (opacity < 1) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  return c;
};

export const getPain = (src?: string) => {
  return src ? convert(marked.parse(src), {
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      { selector: "code", format: "skip" },
      { selector: "table", format: "skip" }
    ]
  }) : "";
};
export const rndAr = <T extends string | number>(a: T[]) => {
  return a[Math.floor(Math.random() * a.length)];
};

export function rndPick<T>(arr: T[], n: number) {
  const l = arr.length;
  if (l <= n) return arr;
  const set = new Set(arr);
  const p = [];
  while (n--) {
    const s = set.size;
    const n = Math.floor(Math.random() * s);
    const o = [...set][n];
    set.delete(o);
    p.push(o);
  }
  return p;
}

export function randNm() {
  const b = [
    "大卫·", "史密斯·", "雷斯", "胖子",
    "尼古拉斯·", "马克思", "呆萌", "唐纳德·",
    "奥斯卡", "扶她", "秀吉", "钢板", "泥人", "光头", "乔布斯·",
    "胸毛", "电动", "芭比", "阿里", "漏气", "疯子",
    "路痴", "花痴", "忧郁", "金刚", "红烧", "油炸", "清蒸", "笨蛋", "可爱"
  ];
  const c = [
    "二狗", "小猫", "爱坤", "小鸭", "小猪", "大佬", "班长",
    "师傅", "八戒", "大妈", "大爷", "二狗",
    "蛋蛋", "星星", "妖精", "老师", "狗狗", "喵喵",
    "奶奶", "子龙", "蒙德", "玄烨", "玄奘", "斯基", "全蛋", "佩恩",
    "奥特曼", "同志", "怪兽", "泰龙",
    "彦祖", "斯坦森", "蛤蛤", "童鞋", "皮卡丘", "少女", "辣子鸡",
    "佩奇", "宝宝", "葫芦娃", "艾莉"
  ];
  return localStorage.nm = `${rndAr(b)}${rndAr(c)}`;
}

type  Btn = HTMLElement & { ani: boolean, cv?: HTMLCanvasElement }

export function bubbles(btn: Btn, click?: () => void) {
  type Bs = {
    x: number
    y: number
    r: number,
    s: number,
    v: number
    q: number
    i: number
  }

  const p = btn.offsetParent;
  if (!p) return;
  if (btn.ani) return;
  btn.ani = true;
  const sl = getComputedStyle(btn);
  if (sl.position !== "absolute" && sl.position !== "relative") {
    btn.style.position = "relative";
  }
  let cv = btn.cv;
  const w = btn.offsetWidth;
  const h = btn.offsetHeight;
  if (!btn.cv) {
    const t = btn.offsetTop - h / 2;
    const l = btn.offsetLeft - w / 2 + 8;
    cv = btn.cv = document.createElement("canvas");
    const s = cv.style;
    s.width = w * 2 + "px";
    s.height = h * 2 + "px";
    s.position = "absolute";
    s.left = l + "px";
    s.top = t + "px";
    s.cursor = "point";
    s.pointerEvents = "none";
    if (click) cv.onclick = e => {
      e.stopPropagation();
      e.preventDefault();
      click();
    };
    cv.width = w * 2;
    cv.height = h * 2;
  }
  if (cv) p.appendChild(cv);
  const ctx = cv?.getContext("2d");
  const bs: Bs[] = [];
  const max = 6;

  function create(x: number, i: number) {
    const idx = i % 2;
    bs.push({
      x: [1.5 * w, 0.5 * w][idx],
      y: [0.5 * h, 1.5 * h][idx],
      r: 5,
      s: 0,
      v: 2 + Math.random() * 2,
      q: (0.5 - Math.random()) * Math.PI,
      i: i
    });
  }

  function draw(o: Bs) {
    if (!ctx) return;
    ctx.beginPath();
    const i = [1, -1][o.i % 2];
    const x = o.s * Math.cos(o.q);
    const y = o.s * Math.sin(o.q);
    ctx.arc(o.x + x * i, o.y - y * i, o.r, 0, Math.PI * 2);
    ctx.fillStyle = sl.backgroundColor;
    ctx.fill();
    ctx.closePath();
  }

  function next(o: Bs) {
    if (!ctx || !cv) return;
    o.r *= 0.9;
    o.v *= 0.95;
    o.s += o.v;
    if ((o.r * o.v <= 0.08) && o.i === max) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (p) p.removeChild(cv);
      delete btn.cv;
      btn.ani = false;
    } else draw(o);
  }

  const run = (fn: (a: number, b: number) => boolean | void, m = 0, i = 0, t = 1) => {
    if (!m || i <= m * t) {
      if (!m || i % t === 0) {
        if (fn(0, i / t)) return;
      }
      requestAnimationFrame(() => run(fn, m, i + 1, t));
    }
  };
  run(create, max, 0, 2);
  run(() => {
    if (!cv || !ctx) return;
    if (!document.body.contains(cv)) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    bs.forEach(next);
  });
}

export const equalSet = (a: Set<unknown>, b: Set<unknown>) => {
  if (a.size === b.size) {
    for (const c of a) {
      if (!b.has(c)) return false;
    }
    return true;
  }
  return false;
};

export const sort = <T extends object>(target: T[], key?: (keyof T)[] | keyof T, desc = 0) => {
  target.sort((a, b) => {
    let s = 0;
    if (!key) s = a > b ? 1 : a === b ? 0 : -1;
    else for (const k of ([] as (keyof T)[]).concat(key)) {
      const v0 = a[k];
      const v1 = b[k];
      if (v0 === v1) continue;
      s = v0 > v1 ? 1 : -1;
    }
    return desc ? 1 - s : s;
  });
  return target;
};

export const watch = (...args: unknown[]) => {
  let keys = JSON.stringify(args);
  return (fn: () => void, ...args: unknown[]) => {
    const nk = JSON.stringify(args);
    if (keys !== nk) {
      keys = nk;
      fn();
    }
  };
};

export const modelArr2Str = <T extends Model>(m: T, key: keyof T, rfKey?: keyof T) => {
  const arr = m[key];
  if (Array.isArray(arr)) return {
    ...m,
    [key]: arr.map(a => a[rfKey || key]).join()
  };
  return m;
};

export const getErr = (e: Error | { data: { message: string } | string }) => {
  if ("data" in e) {
    const d = e.data;
    if (typeof d === "object") {
      if ("message" in (d as object)) return (d as { message: string }).message;
    }
    return d as string;
  }
  return e.message;
};

export const restoreVerify = async (data: ArrayBuffer) => {
  const zip = await JSZip.loadAsync(data);
  const cfg = zip.file(".dbCfg");
  if (!cfg) return ".dbCfg is missing";
  const dbPatch = await cfg.async("string");
  const db = zip.file(dbPatch);
  if (!db) return "database  is missing";
};

export const clientRestore = (done: (m?: string) => void, err: (m: string) => void, before: () => void) => async (e: Event) => {
  const ok = await confirm("Restoring data will erase existing data, do you want to continue?", "continue");
  const ipt = (e.target as HTMLInputElement);
  if (!ok) return ipt.value = "";
  const file = ipt.files?.[0];
  if (file) {
    const buf = await file.arrayBuffer();
    const e = await restoreVerify(buf);
    if (!e) {
      before();
      return req("backup", buf).then((o) => {
          let s = "";
          const a = o as string[]
          if (a && a.length) s = s + "\nbut some errors occurred:" + a.join("\n");
          confirm(s, "", "ok").then(()=>{
              location.reload()
          });
        done("restore success");
        setTimeout(() => location.reload(), 1e3);
      }).catch(e => {
        err(getErr(e));
      });
    } else {
      err(e);
    }
  }
  done();
};
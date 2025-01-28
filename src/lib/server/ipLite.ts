import fs from 'fs';
import JSZip from 'jszip';
import { IP2Location } from 'ip2location-nodejs';
import { sys } from '$lib/server/index';
import { resolve } from 'path';
import https from 'node:https';
import { mkdir } from '$lib/server/utils';

const ip2location = new IP2Location();
const db_type = 'DB3';
const url = `https://www.ip2location.com/download/?token=$TOKEN&file=${db_type}LITEBINIPV6`;
const zip = new JSZip();
const maxSize = 1024 * 1024 * 50;

let cancel = new Function();
let curDownLoad = '';

async function update() {
  clearTimeout(t);
  const dir = sys.ipLiteDir;
  const tk = sys.ipLiteToken;
  if (!tk) return 0;
  const err = mkdir(dir);
  if (err) {
    console.log(err);
    return 0;
  }
  const name = `ip_${Date.now()}`;
  const latest = resolve(dir, name);
  let siz = 0;
  if (curDownLoad && curDownLoad === tk) return 0;
  else {
    cancel?.();
  }

  const query = (url: string) => {
    return new Promise<Uint8Array[]>((resolve, reject) => {
      const data = [] as Uint8Array[];
      const req = https.get(url, (res) => {
        if (res.statusCode && res.statusCode > 300 && res.statusCode < 400) {
          const lo = res.headers.location;
          if (lo) return query(lo).then(resolve).catch(reject);
        }
        res.on('data', (d) => {
          siz += d.length;
          if (siz > maxSize) {
            const err = new Error('max size limit');
            req.destroy(err);
            return reject(err);
          }
          data.push(d);
        });
        res.on('error', reject);
        res.on('end', () => resolve(data));
      });
      cancel = () => {
        curDownLoad = '';
        req.destroy(new Error('new task'));
      };
    });
  };

  curDownLoad = tk;
  const link = url.replace('$TOKEN', tk);
  downloading = 1;
  return await query(link)
    .then((data) => {
      try {
        ip2location.close();
        fs.readdirSync(dir).forEach((a) => {
          if (/^ip_\d+$/.test(a)) {
            try {
              fs.unlinkSync(resolve(dir, a));
            } catch (e) {
              console.log('unlink error:', a, '\n', e?.toString());
            }
          }
        });
        zip
          .loadAsync(Buffer.concat(data))
          .then((result) => {
            return result
              .file(`IP2LOCATION-LITE-${db_type}.IPV6.BIN`)
              ?.async('nodebuffer') as Promise<Buffer>;
          })
          .then((r) => {
            fs.writeFileSync(latest, r);
            load(latest);
            return 1;
          })
          .catch((e) => {
            console.log(e);
          });
      } catch (e) {
        console.log(e);
        return 0;
      }
    })
    .catch((e) => {
      console.log(e);
      return 0;
    })
    .finally(() => {
      downloading = 0;
    });
}

let t: ReturnType<typeof setTimeout>;
let geoIp: typeof ip2location | null;
const load = (file?: string) => {
  if (!file) return;
  ip2location.close();
  ip2location.open(file);
  if (ip2location.loadBin()) {
    geoIp = ip2location;
  } else console.log('fail load bin!');
};
export const geoClose = () => {
  if (geoIp) {
    geoIp.close();
    geoIp = null;
    ip2location.close();
  }
};
let downloading = 0;
export const geoStatue = () => (downloading ? '-' : (geoIp && geoIp.getDatabaseVersion()) || '');
export const loadGeoDb = () => {
  const dir = sys.ipLiteDir && resolve(sys.ipLiteDir);
  if (dir) {
    const next = 1e3 * 3600 * 24 * 14;
    let delay = 0;
    const err = mkdir(dir);
    if (err) {
      console.log(err);
    } else {
      const n = Date.now();
      const file = fs.readdirSync(dir).reduce((a, b) => {
        if (/^ip_\d+/.test(b)) {
          const c = +b.replace(/^ip_/, '');
          if (c < a) return c;
        }
        return a;
      }, n);
      if (file && file !== n) {
        load(resolve(dir, `ip_${file}`));
        delay = next - Date.now() + file;
      }
    }
    setTimeout(() => {
      update().finally(() => {
        t = setTimeout(update, next);
      });
    }, delay);
  }
};

export const ipInfo = (ip: string) => {
  if (!ip) return {};
  if (geoIp) {
    const r = geoIp.getAll(ip);
    return {
      short: r.countryShort,
      full: r.countryLong,
      region: r.region,
      city: r.city
    };
  }
  return {};
};

export const ipInfoStr = (ip: string) => {
  const geo = ipInfo(ip);
  let g0 = '';
  let g1 = '';
  if (geo) {
    g0 = geo.region || geo.short || '';
    if (geo.full !== g0 && geo.short) g1 = ',' + geo.short;
  }
  return g0 + g1;
};

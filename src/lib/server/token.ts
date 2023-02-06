import { randNum, randStr } from "$lib/utils";
import { codeTokens } from "$lib/server/cache";
import type { permission } from "$lib/enum";
import { TokenInfo } from "$lib/server/model";
import type { Obj } from "$lib/types";
import { model } from "$lib/server/utils";


const h = 1e3 * 60;
const expires = [
  h * 24, // admin
  h * 24 * 30 // post
];

export const genToken = (type: permission, cfg: {
  code?: boolean,
  times?: number,
  expire?: number,
  _reqs?: Set<number>
} = {}) => {
  const now = Date.now();
  const token: Obj<TokenInfo> = model(TokenInfo, {
    createAt: now,
    expire: cfg.expire || now + expires[type],
    type,
    _reqs: cfg._reqs
  }, "value");
  if (cfg.code) {
    const cd = randStr(randNum(1e4).toString(36));
    token.code = cd;
    codeTokens.add(cd, token);
  }
  return token as TokenInfo;
};
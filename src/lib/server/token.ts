import { randNum, randStr } from '$lib/utils';
import { codeTokens } from '$lib/server/cache';
import { permission } from '$lib/enum';
import { TokenInfo } from '$lib/server/model';
import type { Obj } from '$lib/types';
import { model } from '$lib/server/utils';

const h = 1e3 * 3600;
const expires = new Map([
	[permission.Admin, h * 24],
	[permission.Post, h * 24 * 30]
]);

export const genToken = (
	type: permission,
	cfg: {
		code?: boolean;
		times?: number;
		expire?: number;
		share?: number | boolean;
		_reqs?: Set<number>;
	} = {}
) => {
	const now = Date.now();
	const token: Obj<TokenInfo> = model(TokenInfo, {
		createAt: now,
		expire: cfg.expire || now + (expires.get(type) || -1),
		type,
		_reqs: cfg._reqs
	});
	if (cfg.code) {
		const cd = randStr(randNum(1e4).toString(36));
		token.code = cd;
		if (cfg.share) token.share = 1;
		codeTokens.add(cd, token);
	}
	return token as TokenInfo;
};

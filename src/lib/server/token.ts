import { permission } from '$lib/enum';
import { TokenInfo } from '$lib/server/model';
import type { Obj } from '$lib/types';
import { model } from '$lib/server/utils';

/** 1 hour in milliseconds */
const ONE_HOUR_MS = 3_600_000;

/** Default token expiration by permission type (in ms) */
const DEFAULT_EXPIRES = new Map<permission, number>([
	[permission.Admin, ONE_HOUR_MS * 24], // 24 hours
	[permission.Post, ONE_HOUR_MS * 24 * 30] // 30 days
]);

/** Sentinel value indicating no expiration / already expired */
const EXPIRE_NONE = -1;

export const genToken = (
	type: permission,
	cfg: {
		times?: number;
		expire?: number;
		_reqs?: Set<number>;
	} = {}
) => {
	const now = Date.now();
	const token: Obj<TokenInfo> = model(TokenInfo, {
		createAt: now,
		expire: cfg.expire ?? now + (DEFAULT_EXPIRES.get(type) ?? EXPIRE_NONE),
		times: cfg.times,
		type,
		_reqs: cfg._reqs
	});
	return token as TokenInfo;
};

import type { APIRoutes } from '../../types';
import { resp, getIp, getReqJson, setToken, getClient } from '../utils';
import { sys } from '../index';
import { permission } from '$lib/enum';
import { verifyTurnstileToken, setTsCookie } from '$lib/server/turnstile';

const apis: APIRoutes = {
	tsVerify: {
		post: async (req) => {
			const siteKey = sys.tsSiteKey;
			const secret = sys.tsSecret;
			if (!sys.tsEnabled || !siteKey || siteKey === '-' || !secret || secret === '-') {
				return resp({ success: false, error: 'turnstile not configured' }, 503);
			}

			const body = await getReqJson(req);
			const token = body?.token as string | undefined;
			if (!token) return resp({ success: false, error: 'missing token' }, 400);

			const ip = getIp(req);
			const ok = await verifyTurnstileToken(token, ip);

			if (ok) {
				const res = resp({ success: true });
				setTsCookie(res, ip);
				return res;
			}

			return resp({ success: false, error: 'verification failed' }, 403);
		}
	},
};

export default apis;
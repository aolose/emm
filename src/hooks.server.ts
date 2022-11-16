import type { Handle } from '@sveltejs/kit';
import * as apis from './lib/server/api';
import type { Api, ApiName } from './lib/types';
import { encryptResp, resp } from './lib/server/utils';
import { encryptHeader, getKINums } from './lib/utils';

export const handle: Handle = async ({ event, resolve }) => {
	// handle api
	const {
		url: { pathname },
		request
	} = event;
	if (pathname.startsWith('/api/')) {
		const k = pathname.slice(5) as ApiName;
		const m = request.method.toLowerCase() as keyof Api;
		const api = apis[k]?.[m];
		if (api) {
			const r = await api(event.request);
			if (r) {
				if (r instanceof Response) return r;
				const eh = encryptHeader(request);
				if (eh) {
					const [kNum] = getKINums(eh);
					return encryptResp(r, kNum);
				}
				return resp(r);
			}
		}
		return resp('');
	}
	return resolve(event);
};

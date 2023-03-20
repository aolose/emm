import type { Handle, HandleServerError } from '@sveltejs/kit';
import { contentType, encryptIv, encTypeIndex } from '$lib/enum';
import { fwFilter, reqRLog } from '$lib/server/firewall';
import { checkStatue, sysStatue } from '$lib/server/utils';
import { checkRedirect } from '$lib/server/utils';
import { server } from '$lib/server';
import { ruv } from "$lib/server/puv";

checkStatue();
export const handle: Handle = async ({ event, resolve }) => {
	if (server.maintain && sysStatue > 1) return new Response('In maintenance', { status: 503 });
	const pn = event.url.pathname;
	let res: Response | undefined;
	const fr = fwFilter(event);
	if (fr?.redirect) {
		res = new Response('', {
			status: 301,
			headers: new Headers({
				location: fr.redirect
			})
		});
	} else if (fr?.forbidden) res = new Response('', { status: 403 });
	else if (!/^\/(api|res|font|src)/.test(pn)) {
		const p = checkRedirect(sysStatue, pn, event.request);
		if (p) {
			res = new Response('', {
				status: 307,
				headers: new Headers({
					location: p
				})
			});
		}
	}
	if (!res)
		res = await resolve(event, {
			filterSerializedResponseHeaders: (name) =>
				[contentType, encryptIv, encTypeIndex, 'location'].indexOf(name.toLowerCase()) > -1
		});
	reqRLog(event, res.status, fr);
	return res;
};

export const handleError = (({ error }) => {
	console.error(error);
	const { data, message, status } = error as {
		status: number;
		data: string;
		message: string;
	};
	return {
		message: message || data,
		status: status
	};
}) satisfies HandleServerError;

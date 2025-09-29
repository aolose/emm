import type { Handle, HandleServerError } from '@sveltejs/kit';
import { contentType, encryptIv, encTypeIndex } from '$lib/enum';
import { firewallProcess } from '$lib/server/firewall';
import { checkStatue, sysStatue } from '$lib/server/utils';
import { server } from '$lib/server';

checkStatue();
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.ip = (event.request.headers.get('x-forwarded-for') || event.getClientAddress()).split(/ +/)[0];
	console.log('server handle',event.locals.ip)
	if (server.maintain && sysStatue > 1) return new Response('In maintenance', { status: 503 });
	//add headers to page load
	const fetch = event.fetch;
	const ua = event.request.headers.get('user-agent');
	if (ua && event.url.pathname.startsWith('/post/'))
		event.fetch = (url, cfg) => {
			cfg = cfg || {};
			cfg.headers = new Headers(cfg.headers || []);
			cfg.headers.set('user-agent', ua);
			return fetch(url, cfg);
		};
	return await firewallProcess(
		event,
		async () =>
			await resolve(event, {
				filterSerializedResponseHeaders: (name) =>
					[contentType, encryptIv, encTypeIndex, 'location'].indexOf(name.toLowerCase()) > -1
			})
	);
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

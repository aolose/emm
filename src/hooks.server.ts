import type { Handle } from '@sveltejs/kit';
import { contentType, encryptIv, encTypeIndex } from '$lib/enum';
import {server} from "$lib/server";
server.start();
export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			[contentType, encryptIv, encTypeIndex].indexOf(name.toLowerCase()) > -1
	});
};

import type { Handle } from '@sveltejs/kit';
import { contentType, encryptIv, encTypeIndex } from './lib/enum';

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			[contentType, encryptIv, encTypeIndex].indexOf(name.toLowerCase()) > -1
	});
};

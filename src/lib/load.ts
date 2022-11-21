import { req } from './req';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from '../../.svelte-kit/types/src/routes/$types';

export const initialized: PageLoad = async ({ url, fetch }) => {
	const i = await req('initialized', undefined, {
		fetch,
		method: 1,
		cache: 1e5
	});
	const config = '/admin/config';
	const cur = url.pathname;
	if (!i && cur !== config) {
		throw redirect(307, config);
	} else if (i && cur === config) {
		throw redirect(307, '/');
	}
};

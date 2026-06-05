import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, data }) => {
	const redirect = url.searchParams.get('redirect') || '/';
	return {
		redirect,
		siteKey: data.siteKey || url.searchParams.get('siteKey') || ''
	};
};

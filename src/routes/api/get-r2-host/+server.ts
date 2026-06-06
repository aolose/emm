import { sys } from '$lib/server';

export const GET = () => {
	const host = sys?.r2Enabled && sys?.r2PublicDomain ? new URL(sys.r2PublicDomain).host : '';
	return Response.json({ r2Host: host });
};

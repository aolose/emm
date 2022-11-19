import type { RequestHandler } from '@sveltejs/kit';
import { apiHandle } from '../../../lib/server/utils';
import { server } from '../../../lib/server';
import type { ApiName } from '../../../lib/types';

server.start();

const handle = (): RequestHandler => {
	return ({ request, params }) => {
		const { api } = params;
		return apiHandle(request, api as ApiName);
	};
};

export const GET = handle();
export const POST = handle();
export const DELETE = handle();
export const PUT = handle();
export const PATCH = handle();

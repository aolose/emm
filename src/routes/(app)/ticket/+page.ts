import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = apiLoad('ticket', undefined, { method: method.GET });

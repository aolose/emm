import { useApi } from '$lib/req';
import { method } from '$lib/enum';

export const load = useApi('ticket', undefined, { method: method.GET });

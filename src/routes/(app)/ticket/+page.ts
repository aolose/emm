import { useApiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = useApiLoad('ticket', undefined, { method: method.GET });

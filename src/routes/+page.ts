import { useApi } from '../lib/req';

export const load = useApi('test', undefined, {
	method: 1,
	cache: 1e3 * 60
});

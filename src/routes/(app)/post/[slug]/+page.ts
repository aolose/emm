import { useApiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = useApiLoad('post', ({ params: { slug } }) => slug, { method: method.GET });

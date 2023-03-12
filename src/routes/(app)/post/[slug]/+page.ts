import { apiLoad } from '$lib/req';
import { method } from '$lib/enum';

export const load = apiLoad('post', ({ params: { slug } }) => slug, { method: method.GET });

import type { Model } from '../types';

type Timer = ReturnType<typeof setTimeout>;
type Record = [Model | Model[] | undefined, Timer];
const modelCacheMap = new Map<string, Record>();

export async function modelCache(
	fn: () => undefined | Model | Model[],
	cacheTime?: number,
	key?: string
) {
	if (!key || !cacheTime) return fn();
	const rec = modelCacheMap.get(key);
	if (rec) {
		const [result] = rec;
		if (result) return result;
	}
	const rec1: Record = [fn(), setTimeout(() => modelCacheMap.delete(key), cacheTime)];
	modelCacheMap.set(key, rec1);
}

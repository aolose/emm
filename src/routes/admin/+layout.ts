import {useApi} from "$lib/req";
import {method} from "$lib/enum";

export const load = useApi('statue',
    undefined,
    {method: method.GET})
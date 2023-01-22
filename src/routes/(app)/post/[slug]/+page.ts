import {useApi} from "$lib/req";
import {method} from "$lib/enum";

export const load = useApi('post',
    ({params: {slug}}) => slug,
    {method: method.GET}
)
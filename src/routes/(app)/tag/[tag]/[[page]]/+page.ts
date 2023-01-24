import {useApi} from "$lib/req";
import {method} from "$lib/enum";

export const load = useApi('posts',
    ({params: {page, tag}}, cfg) => {
        return {
            page: +(page || 1),
            size: 10,
            tag
        }
    },{method: method.GET})
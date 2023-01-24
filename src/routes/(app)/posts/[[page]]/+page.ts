import {useApi} from "$lib/req";
import {method} from "$lib/enum";

export const load = useApi('posts', ({params: {page}}) => {
    return {page: +(page || 1), size: 10}
},{method: method.GET})
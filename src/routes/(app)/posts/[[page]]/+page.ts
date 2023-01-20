import {useApi} from "$lib/req";

export const load = useApi('posts', ({params}) => {
    const page = +(params.page || 1)
    return new Uint8Array([page, 10])
})
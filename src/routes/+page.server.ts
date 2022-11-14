import type {ServerLoad} from "@sveltejs/kit";
import {redirect} from '@sveltejs/kit';
import {sys} from "../lib/server";
import {val} from "../lib/server/utils";


export const load: ServerLoad = async ({params}) => {
    if (!val(sys.admUsr)) {
        throw  redirect(307, '/admin/config')
    }
}
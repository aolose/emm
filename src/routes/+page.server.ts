import type {ServerLoad} from "@sveltejs/kit";
import { error } from '@sveltejs/kit';


export const load: ServerLoad = async ({params}) => {
    throw error(404, 'Not found');
}
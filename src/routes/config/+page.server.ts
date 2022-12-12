import type {ServerLoad} from "@sveltejs/kit";
import {sysStatue} from "$lib/server/utils";

export const load:ServerLoad=()=>{
    return {
        d:sysStatue
    }
}
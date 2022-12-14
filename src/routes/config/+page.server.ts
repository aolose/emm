import type {ServerLoad} from "@sveltejs/kit";
import {checkStatue, sysStatue} from "$lib/server/utils";

export const load:ServerLoad=()=>{
    checkStatue()
    return {
        d:sysStatue
    }
}
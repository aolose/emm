import type {Require} from "$lib/server/model";
import type {Client} from "$lib/server/client";
import type {TokenInfo} from "$lib/types";
export const requireMap = new Map<number,Require>()

export const clientMap = new Map<string,Client>()

export const codeTokens = new Map<string,TokenInfo>
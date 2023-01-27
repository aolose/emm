import type {Require} from "$lib/server/model";
import type {Client} from "$lib/server/client";
import {RequireMap} from "$lib/server/model";
import {addHook, model} from "$lib/server/utils";
import {db} from "$lib/server/index";
import {requireType} from "$lib/server/enum";
import type {TokenInfo} from "$lib/types";
import {codes} from "$lib/server/store";

export const requireMap = new Map<number, Require>()

export const clientMap = new Map<string, Client>()

export const codeTokens = addHook(
    new Map<string, TokenInfo>(),
    ['set', 'delete'],
    () => {
        codes.set(new Set(codeTokens.keys()))
    }
)

export const reqPostCache = (() => {
    let c: RequireMap[] = []
    return {
        load() {
            c = db.all(model(RequireMap, {type: requireType.Post}))
        },
        add(postId: number, reqId: number) {
            if (!c.find(a => a.reqId === reqId && a.targetId === postId)) {
                const n = model(RequireMap, {
                    reqId,
                    targetId: postId,
                    type: requireType.Post
                }) as RequireMap;

                db.save(n, true)
                c = c.concat(n)
            }
        },
        get(rq: { postId?: number, reqId?: number }) {
            const {postId, reqId} = rq
            return c.filter(a => {
                if ((postId && postId !== a.targetId) || (reqId && reqId !== a.reqId)) {
                    return false
                }
                return true
            })
        },
        rm(rq: { postId?: number, reqId?: number }) {
            const {postId, reqId} = rq
            const ks: number[] = []
            c = c.filter(a => {
                if ((postId && postId !== a.targetId) || (reqId && reqId !== a.reqId)) {
                    ks.push(a.id)
                    return false
                }
                return true
            })
            let n = 0
            if (ks.length) {
                n = db.delByPk(RequireMap, ks).changes
            }
            return n
        },
    }
})()
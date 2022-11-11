import {NULL} from "./db/enum";
import type {sqlQueryCallback, sqlRunCallback, promiseCallback} from "./types";
import {getConstraint, primaryKey} from "./model/decorations";

export const is_dev = process.env.NODE_ENV !== 'production'



function setPrimaryKeyId<T extends object>(o: T, id: number) {
    const [k, v] = Object.entries(o).find(([k, v]) =>
        (getConstraint(o, k).has(primaryKey) && typeof v === 'number')) || []
    if (k && v === NULL.INT)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        o[k] = id
}


//resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void
export function toPromise<T>(fn: promiseCallback<T>) {
    return new Promise<T>((resolve, reject) => {
        fn(resolve, reject)
    })
}

export function getQueryResult<T>(cb: sqlQueryCallback<T>) {
    return toPromise<T>((resolve, reject) => {
        cb((err: Error | null, result: T) => {
            if (err) reject(err)
            else resolve(result as T)
        })
    })
}

export function getRunResult<T extends object>(o: T, cb: sqlRunCallback<T>) {
    return toPromise<[number, number]>((resolve, reject) => {
        cb(function (err: Error | null) {
            const {lastID, changes} = this
            if (err) reject(err)
            else {
                setPrimaryKeyId<T>(o, lastID)
                resolve([lastID, changes])
            }
        })
    })
}

export function waitFinish<T>(target: number, fn: (done: (t: T) => void) => void) {
    return new Promise<T>(r => {
        fn((t: T) => {
                target--
                if (!target) r(t)
            }
        )
    })
}

export function noNullKVs(o: object) {
    const keys = [] as string[]
    const values = [] as unknown[]
    const {TEXT, INT, DATE} = NULL
    Object.entries(o).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
            const t = v.constructor.name
            switch (t) {
                case 'String':
                    if (v === TEXT) return
                    break
                case 'Number':
                    if (v !== INT) return
                    break
                case 'Date':
                    if (v.getTime() !== DATE.getTime()) return
                    break
            }
            keys.push(k)
            values.push(v)
        }
    })
    return [keys, values]
}


function now() {
    return `[${new Date().toLocaleString()}]`
}

export const Log = {
    debug(label: string, ...params: unknown[]) {
        if (is_dev) console.log(now(), label, ...params)
    },
    info(label: string, ...params: unknown[]) {
        console.log(now(), label, ...params)
    },
    warn(label: string, ...params: unknown[]) {
        console.warn(now(), label, ...params)
    },
    error(label: string, ...params: unknown[]) {
        console.error(now(), label, ...params)
    },
}
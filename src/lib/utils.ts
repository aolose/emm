export const is_dev = true
// export const is_dev = process.env.NODE_ENV === 'development'


export function toPromis<T>(fn: (cb: (value: (PromiseLike<unknown> | unknown)) => void) => T) {
    return new Promise((r) => {
        fn(r)
    })
}

export function waitFinish<T>(target: number, fn: (done: (t?: T) => void) => void) {
    return new Promise<T | void>(r => {
        fn((t?: T) => {
                target--
                if (!target) r(t)
            }
        )
    })
}
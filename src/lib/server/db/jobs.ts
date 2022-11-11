import {Log} from "../utils";


function job(label: string, fn: () => void, time: number) {
    const run = () => {
        Log.info(`Job ${label} start`)
        fn()
    }
    setTimeout(setInterval, time * Math.random(), run, time)
}

const hour = 3600000
const day = 24 * hour

export function runJobs() {
    ([
        ['cleanSoftDelete', () => {
            // todo
        }, day],
        ['cleanOld', () => {
            // todo
        }, day],
        ['syncCount', () => {
            // todo
        }, day],
        ['syncToMem', () => {
            // todo
        }, day]
    ] as [string, () => void, number][])
        .forEach(([label, fn, dur]) => job(label, fn, dur))
}


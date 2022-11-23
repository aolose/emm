const w = 'abcdefghijklmnopqrstuvwxyz'
const rn = (n: number) => Math.floor(Math.random() * n)

function gen(n: number) {
    n = Math.floor(n / 2) + rn(n / 2)
    const a = [] as string[]
    while (n--) {
        let s = ''
        let b = 1 + rn(4)
        while (b--) s += w[rn(26)]
        a.push(s)
    }
    return a.join(' ')
}

let i = rn(100)
const genPost = () => {
    const p = Date.now() - 1e5 + rn(1e5)
    return {
        id: i++,
        title: gen(5),
        desc: gen(100),
        content: gen(500),
        publish: p,
        update: p + rn(1e3)
    }
}

function* genPosts(n: number) {
    while (n--) {
        yield genPost()
    }
}

export const load = () => {
    return {p:[...genPosts(30)]}
}
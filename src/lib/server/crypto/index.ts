import {algorithm, genShareKey} from "../../utils";

type Timeout = ReturnType<typeof setTimeout>
type privateKey = [CryptoKey, Timeout]
const keyPool = new Map<number, privateKey>()

const expire = 1e3 * 20

let num = 0

export const genPubKey = async (pub: ArrayBuffer): Promise<[number, ArrayBuffer]> => {
    const {subtle} = crypto
    const my = await subtle.generateKey(algorithm, false, ['deriveKey'])
    const myPub = await subtle.exportKey('raw', my.publicKey)
    const cliPub = await subtle.importKey('raw', pub, algorithm, true, [])
    const shareKey = await genShareKey(cliPub, my.privateKey)
    const key = num++ % 0xffff
    keyPool.set(key, [
        shareKey,
        setTimeout(() => {
            keyPool.delete(key)
        }, expire)
    ])
    return [key, myPub]
}
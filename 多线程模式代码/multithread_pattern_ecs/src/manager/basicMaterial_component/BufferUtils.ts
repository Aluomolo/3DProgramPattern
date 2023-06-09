let _getColorSize = () => 3

export let getColorOffset = (count) => 0

export let getColorLength = (count) => count * _getColorSize()

export let getColorIndex = index => index * _getColorSize()

let _getTotalByteLength = (count) => {
    return count * Float32Array.BYTES_PER_ELEMENT * _getColorSize()
}

export let createBuffer = (count) => {
    if (!!globalThis.SharedArrayBuffer) {
        return new SharedArrayBuffer(_getTotalByteLength(count))
    }

    return new ArrayBuffer(_getTotalByteLength(count))
}
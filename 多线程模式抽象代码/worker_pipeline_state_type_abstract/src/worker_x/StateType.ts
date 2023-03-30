export const pipelineName = "Worker_WorkerX"

export type TypeArrayType = Float32Array | Uint8Array | Uint16Array | Uint32Array

export type state = {
    workerXDataBuffer: SharedArrayBuffer | null,
    typeArray: TypeArrayType | null,
    allDataOrientedComponent1Indices: Array<number> | null,
    dataOrientedComponent1Count: number | null,
    dataOrientedComponent1Buffer: SharedArrayBuffer | null,
    otherData: any | null
}

export type states = {
    [pipelineName]: state,
}

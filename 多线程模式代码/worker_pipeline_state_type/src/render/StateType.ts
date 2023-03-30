import { component as material } from "multithread_pattern_ecs/src/component/NoLightMaterialComponentType"

export const pipelineName = "Worker_Render"

type vbo = {
    verticesVBO: WebGLBuffer | null,
    indicesVBO: WebGLBuffer | null,
}

export type state = {
    gl: WebGLRenderingContext | null,
    program: WebGLProgram | null,
    vbo: vbo,
    viewMatrix: Float32Array | null,
    pMatrix: Float32Array | null,
    renderDataBuffer: SharedArrayBuffer | null,
    typeArray: Uint32Array | null,
    renderGameObjectsCount: number | null
    canvas: OffscreenCanvas | null,
    allMaterialIndices: Array<material> | null,
    transformComponentCount: number | null,
    noLightMaterialComponentCount: number | null,
    transformComponentBuffer: SharedArrayBuffer | null,
    noLightMaterialComponentBuffer: SharedArrayBuffer | null,
}

export type states = {
    [pipelineName]: state,
}

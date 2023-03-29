import * as BasicMaterial from "splice_pattern_utils/src/engine/BasicMaterial"
import * as Transform from "splice_pattern_utils/src/engine/Transform"
import { parseGLSLConfig } from "glsl_handler"
import { state } from "./MainStateType"
import { createFakeWebGLRenderingContext } from "splice_pattern_utils/src/engine/FakeGL"
import { getData } from "./glsl/ShaderChunk"
import { Map } from "immutable"
import * as API from "splice_pattern_utils/src/engine/API"
import * as InitBasicMaterialShader from "./InitBasicMaterialShader"
import * as Render from "./Render"

export let createState = (shadersJson, shaderLibsJson): state => {
    let [shaders, shaderLibs] = parseGLSLConfig(shadersJson, shaderLibsJson)

    return {
        gl: createFakeWebGLRenderingContext(),
        programMap: Map(),
        sendDataMap: Map(),
        shaderIndexMap: Map(),
        maxShaderIndex: 0,
        vMatrix: null,
        pMatrix: null,
        shaders,
        shaderLibs,
        isSupportHardwareInstance: true,
        isSupportBatchInstance: false,
        maxDirectionLightCount: 4,
        shaderChunk: getData(),
        precision: "lowp",

        basicMaterialState: BasicMaterial.createState(),
        transformState: Transform.createState()
    }
}

export let createTransform = API.createTransform

export let setFakeTransformData = API.setFakeTransformData

export let createMaterial = API.createMaterial

export let setMaterialFakeColor = API.setMaterialFakeColor

export let setMaterialFakeMap = API.setMaterialFakeMap

export let initCamera = API.initCamera

export let initBasicMaterialShader = InitBasicMaterialShader.initBasicMaterialShader

export let render = Render.render
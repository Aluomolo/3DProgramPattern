import { createState, registerAllPipelines, render } from "render/src/Render"

//假canvas
let canvas = {
    getContext: (_) => 1 as any
}

//指定运行环境为PC端
globalThis.isPC = true


let renderState = createState()

renderState = registerAllPipelines(renderState)

render(renderState, canvas).then(newRenderState => {
    // console.log(JSON.stringify(newRenderState), renderState)
    renderState = newRenderState
})
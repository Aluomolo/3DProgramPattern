# [引入故事，提出问题]

## 需求

开发引擎，实现下面的功能：
渲染包括8000个三角形的大型场景
每帧进行物理计算，更新每个三角形的位置



## 实现思路

使用ECS模式中的Manager层和Component+GameObject层来创建和管理场景
这样做的好处是：
将场景数据保存在组件的Buffer中，它如果是SharedArrayBuffer的话，可以直接在线程之间被共享而无需被拷贝，这样可以提高多线程的性能

因为引擎需要进行初始化、更新和渲染，它们都是连续的逻辑，所以使用管道模式，注册一个Pipeline管道模块。它包括Init Pipeline、Update Pipeline、Render Pipeline这三个管道，它们分别有初始化、更新和渲染相关的Job
这样做的好处是：
1.可以通过管道的并行Job实现多线程的并行逻辑
2.可以通过切换管道，来同时支持单线程和多线程的运行环境


## 给出UML

TODO tu


总体来看，分为用户、门户、管道、Manager+Component+GameObject这四个部分


我们来看下用户、门户这两个部分：

Client是用户

WorldForNoWorker是门户，封装了API


我们来看下管道这个部分：

PipeManager负责管理管道

NoWorkerPipeline是注册的管道模块

Init Pipeline是初始化管道，包括初始化相关的Job，用来实现初始化的逻辑

Update Pipeline是更新管道，包括更新相关的Job，用来实现更新的逻辑

Render Pipeline是渲染管道，包括渲染相关的Job，用来实现渲染的逻辑




我们来看下Manager+Component+GameObject这个部分：

Manager+Component+GameObject是ECS模式中的Manager层和Component+GameObject层，用来创建和管理场景
场景中的一个三角形就是一个GameObject

一共有两种组件：TransformComponent、BasicMaterialComponent
前者负责三角形的位置、模型矩阵
后者负责三角形的材质数据，如颜色

GameObjectManager负责维护所有的gameObject的数据
TransformComponentManager负责维护和管理所有的TransformComponent组件的数据
BasicMaterialComponentManager负责维护和管理所有的BasicMaterialComponent组件的数据


Job调用了Manager+Component+GameObject来读写场景数据
WorldForNoWorker调用了Manager+Component+GameObject来创建场景





下图是流程图：
TODO tu

这里给出了初始化和主循环的一帧的流程，它们都运行在主线程中


初始化运行了Init Pipeline管道，执行下面的Job逻辑：
首先在“Create GL”中创建了WebGL上下文；
然后在“Init VBO”中初始化VBO；
最后在“Init Material”中初始化材质


主循环的一帧首先运行了Update Pipeline管道，执行下面的Job逻辑：
首先在“Compute Physics And Update”中进行物理计算，并更新所有TransformComponent组件的位置；
最后在“Update Transform”中更新所有TransformComponent组件的模型矩阵

主循环的一帧接着运行了Render Pipeline管道，执行下面的Job逻辑：
首先在“Send Uniform Shader Data”中发送相机数据到GPU；
最后在“Render”中渲染







## 给出代码

首先，我们看下用户的代码；
然后，我们看下创建WorldState的相关代码；
然后，我们看下创建场景的相关代码；
然后，我们看下各个管道的Job的代码；
然后，我们看下初始化的相关代码；
然后，我们看下主循环的相关代码；
最后，我们运行代码


### 用户的代码


Client
```ts
let worldState = createState({ transformComponentCount: 8000, basicMaterialComponentCount: 8000 })

worldState = createScene(worldState, 8000)

worldState = registerAllPipelines(worldState)

let canvas = document.querySelector("#canvas")

init(worldState, canvas).then(worldState => {
    _loop(worldState)
})
```

我们首先调用createState函数并传入最大的组件个数，创建了WorldState，用来保存所有的数据；
然后创建场景；
然后注册了所有的管道；
然后初始化；
最后主循环


### 创建WorldState的相关代码


WorldForNoWorker
```ts
export let createState = ({ transformComponentCount, basicMaterialComponentCount }): state => {
    return {
        ecsData:
        {
            gameObjectManagerState: createGameObjectManagerState(),
            transformComponentManagerState: createTransformManagerState(transformComponentCount),
            basicMaterialComponentManagerState: createBasicMateiralManagerState(basicMaterialComponentCount)
        },
        pipelineState: createPipelineManagerState(),
    }
}
```

createState函数创建的WorldState包括了场景数据和管道数据，其中场景数据保存在各个Manager的state中，管道数据保存在PipelineManagerState


### 创建场景的相关代码

Client
```ts
worldState = createScene(worldState, 8000)
```
utils->Client
```ts
let _createTriangle = (worldState: worldState, color: Array<number>, position: Array<number>): worldState => {
    let triangleGameObjectData = createGameObject(worldState)
    worldState = triangleGameObjectData[0]
    let triangleGameObject = triangleGameObjectData[1]

    let transformComponentData = createTransformComponent(worldState)
    worldState = transformComponentData[0]
    let transformComponent = transformComponentData[1]
    let basicMateiralComponentData = createBasicMaterialComponent(worldState)
    let basicMaterialComponent = basicMateiralComponentData[1]
    worldState = basicMateiralComponentData[0]

    worldState = setTransformComponent(worldState, triangleGameObject, transformComponent)
    worldState = setBasicMaterialComponent(worldState, triangleGameObject, basicMaterialComponent)

    worldState = setPosition(worldState, transformComponent, position)
    worldState = setColor(worldState, basicMaterialComponent, color)

    return worldState
}

export let createScene = (worldState: worldState, count: number): worldState => {
    return range(0, count - 1).reduce(worldState => {
        return _createTriangle(worldState, [
            Math.random(), Math.random(), Math.random()
        ], [
            Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1
        ])
    }, worldState)
}
```

这里创建了包括8000个三角形的场景
每个三角形都是一个GameObject，它挂载了两个组件：TransformComponent、BasicMaterialComponent
每个三角形的位置、颜色都为随机值

因为这里使用了ECS模式，所以创建场景的实现代码跟ECS模式章节中的案例代码是一样的，故这里省略相关代码

值得注意的是：
这里组件的Buffer是ArrayBuffer而不是SharedArrayBuffer
这是因为：
目前只是单线程，不需要在线程之间共享Buffer；
ArrayBuffer的兼容性更好




### 各个管道的Job的代码

Client在注册所有的管道时，注册了NoWorkerPipeline，它包括Init Pipeline、Update Pipeline、Render Pipeline这三个管道

我们看下Init Pipeline管道的各个Job代码：
CreateGLJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let canvas: HTMLCanvasElement = globalThis.canvas

	return mostService.callFunc(() => {
		console.log("create gl job")

		let gl = canvas.getContext("webgl")

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...getState(states),
				gl: gl
			})
		)
	})
}
```

该Job创建了WebGL上下文

InitVBOJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let state = getState(states)

	return mostService.callFunc(() => {
		console.log("init vbo job")

		let gl = getExnFromStrictNull(state.gl)

		let {
			verticesBuffer,
			indicesBuffer
		} = createVBOs(gl)

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...getState(states),
				vbo: {
					verticesVBO: verticesBuffer,
					indicesVBO: indicesBuffer
				}
			})
		)
	})
}
```

该Job初始化VBO

InitMaterialJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("init material job");

        let gl = getExnFromStrictNull(state.gl)

        let program = createProgram(gl)

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...state,
                program: program
            })
        )
    })
}
```

该Job初始化材质
因为只有一种材质（BasicMaterialComponent），该材质只对应一个Shader，所以这里只创建了一个Program


我们看下Update Pipeline管道的各个Job代码：
ComputePhysicsAndUpdateJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
    return mostService.callFunc(() => {
        console.log("compute physics job")

        //计算多个平均值，用它们更新所有TransformComponent组件的位置
        worldState = _updateAllTransformPositions(worldState, computeAveragePositions(worldState, getAllTransformComponents(getExnFromStrictNull(worldState.ecsData.transformComponentManagerState))))

        return worldState
    })
}
```
该Job进行物理计算，并更新了所有TransformComponent组件的位置

UpdateTransformJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
    return mostService.callFunc(() => {
        console.log("update transform job")

        //更新所有TransformComponent组件的模型矩阵
        let transformComponentManagerState = batchUpdate(getExnFromStrictNull(worldState.ecsData.transformComponentManagerState))

        return {
            ...worldState,
            ecsData: {
                ...worldState.ecsData,
                transformComponentManagerState
            }
        }
    })
}
```

该Job更新所有TransformComponent组件的模型矩阵


我们看下Render Pipeline管道的各个Job代码：
SendUniformShaderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let state = getState(states)

	return mostService.callFunc(() => {
		console.log("send uniform shader data job");

		let gl = getExnFromStrictNull(state.gl)

		let program = getExnFromStrictNull(state.program)

		//假的相机数据
		let viewMatrix = new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0])
		let pMatrix = new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0])

		sendCameraData(gl, viewMatrix, pMatrix, [program])

		return worldState;
	})
}
```

该Job发送相机数据到GPU

RenderJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("render job")

        let gl = getExnFromStrictNull(state.gl)

        clear(gl)

        //遍历场景中所有的gameObject
        getAllGameObjects(getExnFromStrictNull(worldState.ecsData.gameObjectManagerState)).forEach(gameObject => {
            //获得组件
            let material = getMaterialExn(getExnFromStrictNull(worldState.ecsData.basicMaterialComponentManagerState), gameObject)
            let transform = getTransformExn(getExnFromStrictNull(worldState.ecsData.transformComponentManagerState), gameObject)

            //获得渲染的相关数据
            let [count, program, color, modelMatrix] = getRenderData(material, transform, getExnFromStrictNull(state.program), getExnFromStrictNull(worldState.ecsData.basicMaterialComponentManagerState), getExnFromStrictNull(worldState.ecsData.transformComponentManagerState))

            //渲染该gameObject
            render(gl, getExnFromStrictNull(state.vbo.verticesVBO), getExnFromStrictNull(state.vbo.indicesVBO), program, modelMatrix, color, count)
        })

        return worldState
    })
}
```

该Job渲染所有的三角形



### 初始化的相关代码

WorldForNoWorker
```ts
export let init = (state: state, canvas): Promise<state> => {
    state = initPipelineManager(state, [
        unsafeGetPipeManagerState, setPipeManagerState
    ])

    globalThis.canvas = canvas

    return runPipeline(state, "init")
}
```

这里首先初始化PipelineManager；
然后保存canvas到全局变量中，从而在CreateGLJob中获得它；
最后运行了Init Pipeline管道，执行其中的Job


### 主循环的相关代码

Client
```ts
let _loop = (worldState: worldState) => {
    update(worldState).then(worldState => {
        render(worldState).then(worldState => {
            console.log("after render")

            requestAnimationFrame(
                (time) => {
                    _loop(worldState)
                }
            )
        })
    })
}

init(worldState, canvas).then(worldState => {
    _loop(worldState)
})
```

主循环的一帧进行了更新和渲染，我们看下相关代码
WorldForNoWorker
```ts
export let update = (state: state): Promise<state> => {
    return runPipeline(state, "update")
}

export let render = (state: state): Promise<state> => {
    return runPipeline(state, "render")
}
```

它们分别运行了对应的Update Pipeline和Render Pipeline管道，执行其中的Job




### 运行代码

运行截图如下：
TODO tu

<!-- 该场景包括了8000个三角形 -->





## 提出问题


- 性能差
因为场景中三角形过多，导致FPS较低



# [给出使用模式的改进方案]

## 概述解决方案

目前所有的逻辑都运行在主线程

因为现代CPU都是多核的，每个核对应一个线程，所以支持多个线程并行运行

因此，可以开一个渲染线程和一个物理线程。前者负责渲染，后者负责物理计算
让它们和主线程并行运行，从而提高FPS

其中，渲染线程只读主线程的数据，物理线程读写主线程的数据

为了避免冲突，首先对物理线程写的主线程数据进行备份；然后让物理线程去写备份数据；最后在主线程的同步阶段读取备份数据，更新主线程的数据





## 给出UML？

TODO tu


总体来看，分为Main Worker、Render Worker、Physics Worker这三个部分

Main Worker对应主线程，包括了运行在主线程的模块；
Render Worker对应渲染线程，包括了运行在渲染线程的模块；
Physics Worker对应物理线程，包括了运行在物理线程的模块

<!-- 这三个部分的模块结构跟之前一样，都是有一个用户，它调用了一个门户；
门户调用一个PipelineManager模块来管理管道；
门户调用了Manager+Component+GameObject来创建场景；
门户包括一个管道模块；
管道模块包括几个管道，每个管道包括多个Job；
Job调用了Manager+Component+GameObject来读写场景数据 -->

这三个部分的模块结构跟之前一样，只是用户、门户、管道模块、管道不一样
具体不一样的地方如下：
这三个部分的用户分别为Client、RenderWorkerMain、PhysicsWorkerMain
这三个部分的门户分别为WorldForMainWorker、WorldForRenderWorker、WorldForPhysicsWorker
这三个部分的管道模块分别包括下面的管道：
- Init Pipeline、Update Pipeline、Sync Pipeline
- Init Pipeline、Render Pipeline
- Init Pipeline、Update Pipeline




我们看下这三个部分对应的三个线程之间的数据传送：
主要有两种方式来实现线程之间的数据传送：
- 拷贝
- 共享

这里介绍下共享：
主线程将canvas通过OffscreenCavnas API共享到渲染线程，渲染线程可从中获得WebGL上下文；
我们设置两种组件的两个Buffer为SharedArrayBuffer，它们由主线程创建，被共享到渲染线程和物理线程，使他们能够从中读写场景数据；
主线程创建了RenderWorkderData的Buffer，也是SharedArrayBuffer，用来保存场景中所有的transformComponent和basicMaterialComponent。主线程将其共享给渲染线程，使渲染线程能够通过它们获得场景数据（如位置）；
主线程创建了PhysicsWorkderData的Buffer，也是SharedArrayBuffer，用来保存场景中所有的transformComponent的位置。主线程将其共享给物理线程，使物理线程能够将计算出的位置写进去


为什么物理线程不直接将计算出的位置写到共享的TransformComponent组件的Buffer中呢？
因为这就是之前提到的为了解决冲突而进行备份的具体实现，我们等下再来讨论







我们来看下流程图

首先是初始化流程图：
TODO tu


总体来看，分为Main Worker、Render Worker、Physics Worker这三个部分

Main Worker包括了运行在主线程的Init Pipeline的Job，Render Worker包括了运行在渲染线程的Init Pipeline的Job，Physics Worker包括了运行在物理线程的Init Pipeline的Job 

<!-- 这里并行运行了三个线程的Init Pipeline -->
这些Init Pipeline是并行运行的


我们看下Main Worker这个部分：
<!-- 具体的运行顺序如下； -->
<!-- 首先，我们看下主线程的初始化流程： -->
1.主线程在“Create Worker Instance”中创建了渲染线程和物理线程的worker，这会执行它们的用户（RenderWorkerMain、PhysicsWorkerMain）的代码，从而运行它们的Init Pipeline
<!-- ，等待主线程发送数据； -->
2.主线程会执行三条并行的Job线
第一条Job线依次执行这些Job逻辑：
在“Create Render Data Buffer”中创建了RenderWorkderData的Buffer、在“Create Physics Data Buffer”中创建PhysicsWorkerData的Buffer、在“Send Init Render Data”中向渲染线程发送了初始化数据、在“Send Init Physics Data”中向物理线程发送了初始化数据；

第二条Job线依次执行这些Job逻辑：
在“Get Finish Send Init Render Data”中等待渲染线程发送结束初始化的指令
第三条Job线依次执行这些Job逻辑：
在“Get Finish Send Init Physics Data”中等待物理线程发送结束初始化的指令


<!-- 然后，我们看下渲染线程的初始化流程： -->
我们看下Render Worker这个部分：
1.渲染线程在“Get Init Render Data”中获得主线程发送的渲染数据后，开始初始化渲染，依次执行这些Job逻辑：
在“Init Data Oriented Components”中初始化TransformComponent和BasicMaterialComponent、在“Create Render Data Buffer TypeArray”中创建RenderWorkerData的Buffer的视图、在“Create GL”中创建WebGL上下文、在“Init Material”中初始化材质、在“Send Finish Init Render Data”中向主线程发送结束初始化的指令


<!-- 最后，我们看下渲染线程的初始化流程： -->
我们看下Physics Worker这个部分：
1.物理线程在“Get Init Physics Data”中获得主线程发送的物理数据后，开始初始化物理，依次执行这些Job逻辑：
在“Init Data Oriented Components”中初始化TransformComponent和BasicMaterialComponent、在“Create Physics Data Buffer TypeArray”中创建PhysicsWorkerData的Buffer的视图、在“Send Finish Init Physics Data”中向主线程发送结束初始化的指令








然后来看下主循环的一帧流程图：
TODO tu

<!-- 图中的虚线是指线程之间在时间上的对应关系 -->


总体来看，分为Main Worker、Render Worker、Physics Worker这三个部分

Main Worker包括了运行在主线程的Update Pipeline和Sync Pipeline的Job，Render Worker包括了运行在渲染线程的Render Pipeline的Job，Physics Worker包括了运行在物理线程的Update Pipeline的Job 

<!-- 
主线程的Update Pipeline和渲染线程的Render Pipeline、物理线程的Update Pipeline是并行运行的；
主线程的Sync Pipeline是单独运行的
 -->
这里首先并行运行了主线程的Update Pipeline、渲染线程的Render Pipeline、物理线程的Update Pipeline；
然后运行了主线程的Sync Pipeline


我们看下Main Worker这个部分：

<!-- 具体的运行顺序如下； -->
首先，我们看下主线程的Update Pipeline的流程：

1.因为每一帧场景可能都有变化，所以在“Update Render Data Buffer”中g更新了RenderWorkderData的Buffer中的组件数据；
2.主线程向渲染线程和物理线程发送开始主循环的指令。当这两个线程接收到该指令后，会分别运行Render Pipeline和Update Pipeline
<!-- 3.主线程在发送开始主循环的指令后，向渲染线程发送了渲染数据，然后结束了Update Pipeline，开始运行Sync Pipeline，等待另外两个线程发送结束指令 -->
3.主线程向渲染线程发送了渲染数据


然后，我们看下渲染线程的Render Pipeline的流程：
1.依次执行这些Job逻辑：在“Get Render Data”中获得主线程发送的渲染数据、在“Send Uniform Shader Data”中发送相机数据到GPU、在“Render”中渲染、在“Send Finish Render Data”中向主线程发送结束指令


然后，我们看下物理线程的Update Pipeline的流程：
1.依次执行这些Job逻辑：在“Compute Physics”中物理计算、在“Send Finish Physics Data”中向主线程发送结束指令


最后，我们看下主线程的Sync Pipeline的流程：
1.主线程在“Get Finish Render Data”和“Get Finish Physics Data”中分别获得两个线程发送来的结束指令后，依次执行这些Job逻辑：在“Update All Transform Positions”中从备份数据中获得物理线程中经过物理计算得到的值，来更新所有TransformComponent组件的位置；
在“Update Transform”中更新所有TransformComponent组件的模型矩阵






这里回答之前的“为什么物理线程不直接将计算出的位置写到共享的TransformComponent组件的Buffer中呢？”问题：
主线程和物理线程的Update Pipeline是在同一时间并行运行的，如果物理线程将计算出的位置写到TransformComponent组件的Buffer中，那么此后主线程从中读取位置时可能获得修改后的值而不是原始值，从而造成冲突
因此为了避免冲突，首先物理线程将计算出的位置写到PhysicsWorkderData的Buffer中；然后在主线程的Sync Pipeline管道中再将其写到TransformComponent组件的Buffer中




值得注意的是，渲染线程和物理线程相比主线程是延迟了一帧的。
这是因为在主线程的Sync Pipeline的“Update Transform” Job会更新模型矩阵，这更新后的值只能在下一帧被渲染线程和物理线程使用


## 结合UML图，描述如何具体地解决问题？

- 因为把渲染和物理计算的逻辑从主线程分别移到了两个线程中，从而与主线程并行运行，所以提高了FPS



## 给出代码？

首先，我们看下主线程中用户的代码；
然后，我们看下主线程在初始化阶段运行的Init Pipeline的Job的代码；
然后，我们看下渲染线程中用户的代码；
然后，我们看下物理线程中用户的代码；
然后，我们看下渲染线程在初始化阶段运行的Init Pipeline的Job的代码；
然后，我们看下物理线程在初始化阶段运行的Init Pipeline的Job的代码；

在看完了初始化阶段后，我们就会看下主循环阶段的相关代码，具体步骤如下：
首先，我们看下主线程的Update Pipeline的Job的代码；
然后，我们看下渲染线程的Render Pipeline的Job的代码；
然后，我们看下物理线程的Update Pipeline的Job的代码；
然后，我们看下主线程的Sync Pipeline的Job的代码；
最后，我们运行代码



### 主线程中用户的代码


Client
```ts
let isUseWorker = true

let transformComponentCount = 8000
let basicMaterialComponentCount = 8000

globalThis.transformComponentCount = transformComponentCount
globalThis.basicMaterialComponentCount = basicMaterialComponentCount

globalThis.maxRenderGameObjectCount = 8000


let worldState = createState({ transformComponentCount, basicMaterialComponentCount })

worldState = createScene(worldState, 8000)

if (isUseWorker) {
    worldState = registerWorkerAllPipelines(worldState)
}
else {
    worldState = registerNoWorkerAllPipelines(worldState)
}

let canvas = document.querySelector("#canvas")

let _loop = (worldState: worldState) => {
    update(worldState).then(worldState => {
        let handlePromise

        if (isUseWorker) {
            handlePromise = sync(worldState)
        }
        else {
            handlePromise = render(worldState)
        }

        handlePromise.then(worldState => {
            console.log("after sync")

            requestAnimationFrame(
                (time) => {
                    _loop(worldState)
                }
            )
        })
    })
}

init(worldState, canvas).then(worldState => {
    _loop(worldState)
})
```

这里跟之前不一样的地方是：

- 创建场景时，组件的Buffer是SharedArrayBuffer，不是ArrayBuffer
- 通过注册不同的管道，同时支持了多线程和单线程的运行环境。其中，对于多线程的运行环境，注册了MainWorkerPipeline，它包括Init Pipeline、Sync Pipeline这两个管道；对于单线程的运行环境，注册的管道模块跟之前一样
- 主循环增加了处理多线程的运行环境的情况，该情况的处理是依次运行Update Pipeline和Sync Pipeline



### 主线程在初始化阶段运行的Init Pipeline的Job的代码

我们看下Init Pipeline管道的各个Job代码：

CreateWorkerInstanceJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    return mostService.callFunc(() => {
        console.log("create worker instance job exec on main worker")

        let renderWorker = new Worker(new URL("../../../render/RenderWorkerMain", import.meta.url))
        let physicsWorker = new Worker(new URL("../../../physics/PhysicsWorkerMain", import.meta.url))

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                renderWorker,
                physicsWorker
            })
        )
    })
}
```

该Job创建渲染线程和物理线程的worker
创建worker后，会执行运行在该线程的用户（RenderWorkerMain、PhysicsWorkerMain）的代码

CreateRenderDataBufferJob
```ts
let _getMaxRenderGameObjectCount = () => (globalThis as any).maxRenderGameObjectCount

let _getStride = () => 2 * 4

export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	return mostService.callFunc(() => {
		console.log("create render data buffer job exec on main worker")

		let buffer = new SharedArrayBuffer(
			_getMaxRenderGameObjectCount() * _getStride()
		)

		let renderDataBufferTypeArray = new Uint32Array(buffer)

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...getState(states),
				renderDataBuffer: buffer,
				renderDataBufferTypeArray: renderDataBufferTypeArray
			})
		)
	})
}
```

该Job创建RenderWorkderData的Buffer，用来保存场景中所有的transformComponent和basicMaterialComponent

CreatePhysicsDataBufferJob
```ts
let _getMaxTransformComponentCount = () => (globalThis as any).transformComponentCount

let _getStride = () => 3 * 4

export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	return mostService.callFunc(() => {
		console.log("create physics data buffer job exec on main worker")

		let buffer = new SharedArrayBuffer(
			_getMaxTransformComponentCount() * _getStride()
		)

		let physicsDataBufferTypeArray = new Float32Array(buffer)

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...getState(states),
				physicsDataBuffer: buffer,
				physicsDataBufferTypeArray: physicsDataBufferTypeArray
			})
		)
	})
}
```

该Job创建PhysicsWorkderData的Buffer，用来保存场景中所有的transformComponent的位置


SendInitRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { renderWorker, renderDataBuffer } = getState(states)

	return mostService.callFunc(() => {
		console.log("send init render data job exec on main worker")

		renderWorker = getExnFromStrictNull(renderWorker)

		let canvas: HTMLCanvasElement = (globalThis as any).canvas
		let transformComponentCount = (globalThis as any).transformComponentCount
		let basicMaterialComponentCount = (globalThis as any).basicMaterialComponentCount

		let offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen()

		let allMaterialIndices = getAllBasicMaterials(getExnFromStrictNull(worldState.ecsData.basicMaterialComponentManagerState))

		renderWorker.postMessage({
			command: "SEND_INIT_RENDER_DATA",
			canvas: offscreenCanvas,
			renderDataBuffer: getExnFromStrictNull(renderDataBuffer),
			allMaterialIndices: allMaterialIndices,
			transformComponentCount,
			basicMaterialComponentCount,
			transformComponentBuffer: getExnFromStrictNull(worldState.ecsData.transformComponentManagerState).buffer,
			basicMaterialComponentBuffer: getExnFromStrictNull(worldState.ecsData.basicMaterialComponentManagerState).buffer
		}, [offscreenCanvas])

		return worldState
	})
}
```
该Job向渲染线程发送初始化数据
其中，组件的Buffer和RenderWorkerData的Buffer是通过SharedArrayBuffer共享过去的；canvas是通过OffscreenCavnas API共享过去的；其它数据是拷贝过去的



SendInitPhysicsDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { physicsWorker, physicsDataBuffer } = getState(states)

	return mostService.callFunc(() => {
		console.log("send init physics data job exec on main worker")

		physicsWorker = getExnFromStrictNull(physicsWorker)

		let transformComponentCount = (globalThis as any).transformComponentCount

		let allTransformIndices = getAllTransforms(getExnFromStrictNull(worldState.ecsData.transformComponentManagerState))

		physicsWorker.postMessage({
			command: "SEND_INIT_PHYSICS_DATA",
			physicsDataBuffer: getExnFromStrictNull(physicsDataBuffer),
			allTransformIndices: allTransformIndices,
			transformComponentCount,
			transformComponentBuffer: getExnFromStrictNull(worldState.ecsData.transformComponentManagerState).buffer,
		})

		return worldState
	})
}
```



该Job向物理线程发送初始化数据
其中，组件的Buffer和PhysicsWorkerData的Buffer是通过SharedArrayBuffer共享过去的；其它数据是拷贝过去的


GetFinishSendInitRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { renderWorker } = getState(states)

	renderWorker = getExnFromStrictNull(renderWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_INIT_RENDER_DATA", renderWorker).map(() => {
		console.log("get finish send init render data job exec on main worker")

		return worldState
	})
}
```

该Job等待渲染线程发送结束初始化的指令



GetFinishSendInitPhysicsDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { physicsWorker } = getState(states)

	physicsWorker = getExnFromStrictNull(physicsWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_INIT_PHYSICS_DATA", physicsWorker).map(() => {
		console.log("get finish send init physics data job exec on main worker")

		return worldState
	})
}
```

该Job等待物理线程发送结束初始化的指令




### 渲染线程中用户的代码


RenderWorkerMain
```ts
let _frame = (worldState: worldState) => {
	return render(worldState)
}

let _registerAllPipelines = (worldState: worldState): worldState => {
	let pipelineManagerState = registerPipeline(
		unsafeGetPipeManagerState(worldState),
		getRenderWorkerPipeline(),
		[]
	)

	return setPipeManagerState(worldState, pipelineManagerState)
}

let worldState = createStateForWorker()

worldState = _registerAllPipelines(worldState)


let tempWorldState: worldState | null = null

init(worldState).then(worldState => {
	console.log("finish init on render worker");

	tempWorldState = worldState
})

//主循环
//基于most.js库，使用FRP处理异步
mostService.drain(
	mostService.tap(
		(_) => {
			_frame(getExnFromStrictNull(tempWorldState)).then((worldState) => {
				tempWorldState = worldState
			})
		},
		mostService.filter(
			(event) => {
				console.log(event);
				return event.data.command === "SEND_BEGIN_LOOP";
			},
			mostService.fromEvent<MessageEvent, Window & typeof globalThis>("message", self, false)
		)
	)
)
```

该模块在主线程的CreateWorkerInstanceJob创建render worker后执行

该模块首先创建了WorldState，用来保存渲染线程所有的数据；
然后注册了RenderWorkerPipeline的Init Pipeline、Render Pipeline；
然后初始化，运行Init Pipeline；
最后主循环

值得说明的是，这里的主循环跟之前的主线程的主循环不一样，它的实现原理如下：
在主循环的一帧中，等待主线程的Update Pipeline的"Send Begin Loop Data" Job发送开始主循环的指令-"SEND_BEGIN_LOOP"；
获得指定后，执行一次_frame函数，运行渲染线程的Render Pipeline进行渲染


### 物理线程中用户的代码
PhysicsWorkerMain的代码跟RenderWorkerMain的代码基本上是一样的，故省略了它的代码

它们的不同之处是：
注册了不一样的管道，具体是注册了PhysicsWorkerPipeline的Init Pipeline、Update Pipeline


该模块在主线程的CreateWorkerInstanceJob创建physics worker后执行




### 渲染线程在初始化阶段运行的Init Pipeline的Job的代码


GetInitRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let offscreenCanvas: OffscreenCanvas
    let renderDataBuffer: SharedArrayBuffer
    let allMaterialIndices: Array<number>
    let transformComponentCount: number, basicMaterialComponentCount: number
    let transformComponentBuffer: SharedArrayBuffer, basicMaterialComponentBuffer: SharedArrayBuffer

    return createGetMainWorkerDataStream(
        mostService,
        (event: MessageEvent) => {
            offscreenCanvas = event.data.canvas
            renderDataBuffer = event.data.renderDataBuffer
            allMaterialIndices = event.data.allMaterialIndices
            transformComponentCount = event.data.transformComponentCount
            basicMaterialComponentCount = event.data.basicMaterialComponentCount
            transformComponentBuffer = event.data.transformComponentBuffer
            basicMaterialComponentBuffer = event.data.basicMaterialComponentBuffer
        },
        "SEND_INIT_RENDER_DATA",
        self as any as Worker
    ).map(() => {
        console.log("get init render data job exec on render worker")

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                canvas: offscreenCanvas,
                renderDataBuffer: renderDataBuffer,
                allMaterialIndices: allMaterialIndices,
                transformComponentCount: transformComponentCount,
                basicMaterialComponentCount: basicMaterialComponentCount,
                transformComponentBuffer: transformComponentBuffer,
                basicMaterialComponentBuffer: basicMaterialComponentBuffer
            })
        )
    })
}
```

该Job获得主线程发送的渲染数据

InitDataOrientedComponentsJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let { transformComponentCount, basicMaterialComponentCount, transformComponentBuffer, basicMaterialComponentBuffer } = getState(states)

    return mostService.callFunc(() => {
        console.log("init data oriented components job exec on render worker");

        return createDataOrientedComponentStates(worldState, transformComponentCount, basicMaterialComponentCount, transformComponentBuffer, basicMaterialComponentBuffer)
    })
}
```

该Job初始化共享的TransformComponent和BasicMaterialComponent的Buffer
具体是创建了它们的视图，从而能够通过视图读Buffer的数据


CreateRenderDataBufferTypeArrayJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("create render data buffer type array job exec on render worker");

        let renderDataBufferTypeArray = new Uint32Array(getExnFromStrictNull(state.renderDataBuffer))

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...state,
                typeArray: renderDataBufferTypeArray
            })
        )
    })
}
```

该Job创建RenderWorkerData的Buffer的视图，从而能够通过视图读Buffer的数据


CreateGLJob
<!-- ```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { canvas } = getState(states)

	return mostService.callFunc(() => {
		console.log("create gl job exec on render worker");

		let gl = canvas.getContext("webgl") as any as WebGLRenderingContext

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...getState(states),
				gl: gl
			})
		)
	})
}
``` -->
该Job代码除了是从主线程传来的渲染数据获得canvas以外，其它都跟之前一样


InitMaterialJob
<!-- ```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("init material job exec on render worker");

        let gl = getExnFromStrictNull(state.gl)

        let program = createProgram(gl)

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...state,
                program: program
            })
        )
    })
}
``` -->

该Job代码跟之前一样

SendFinishInitRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
    return mostService.callFunc(() => {
        console.log("send finish init render data job exec on render worker")

        postMessage({
            command: "FINISH_SEND_INIT_RENDER_DATA"
        })

        return worldState
    })
}
```

该Job向主线程发送结束初始化的指令



### 物理线程在初始化阶段运行的Init Pipeline的Job的代码


GetInitPhysicsDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let allTransformIndices: Array<number>
    let physicsDataBuffer: SharedArrayBuffer
    let transformComponentCount: number
    let transformComponentBuffer: SharedArrayBuffer

    return createGetMainWorkerDataStream(
        mostService,
        (event: MessageEvent) => {
            allTransformIndices = event.data.allTransformIndices
            physicsDataBuffer = event.data.physicsDataBuffer
            transformComponentCount = event.data.transformComponentCount
            transformComponentBuffer = event.data.transformComponentBuffer
        },
        "SEND_INIT_PHYSICS_DATA",
        self as any as Worker
    ).map(() => {
        console.log("get init physics data job exec on physics worker");

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                allTransformIndices,
                physicsDataBuffer,
                transformComponentCount,
                transformComponentBuffer,
            })
        )
    })
}
```


该Job获得主线程发送的物理数据


InitDataOrientedComponentsJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let allTransformIndices: Array<number>
    let physicsDataBuffer: SharedArrayBuffer
    let transformComponentCount: number
    let transformComponentBuffer: SharedArrayBuffer

    return createGetMainWorkerDataStream(
        mostService,
        (event: MessageEvent) => {
            allTransformIndices = event.data.allTransformIndices
            physicsDataBuffer = event.data.physicsDataBuffer
            transformComponentCount = event.data.transformComponentCount
            transformComponentBuffer = event.data.transformComponentBuffer
        },
        "SEND_INIT_PHYSICS_DATA",
        self as any as Worker
    ).map(() => {
        console.log("get init physics data job exec on physics worker");

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                allTransformIndices,
                physicsDataBuffer,
                transformComponentCount,
                transformComponentBuffer,
            })
        )
    })
}
```


该Job初始化共享的TransformComponent的Buffer
具体是创建了它们的视图，从而能够通过视图读Buffer的数据


CreatePhysicsDataBufferTypeArrayJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("create physics data buffer type array job exec on physics worker");

        let positions = new Float32Array(getExnFromStrictNull(state.physicsDataBuffer))

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...state,
                positions: positions
            })
        )
    })
}
```

该Job创建PhysicsWorkerData的Buffer的视图，从而能够通过视图写Buffer的数据

SendFinishInitPhysicsDataJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
    return mostService.callFunc(() => {
        console.log("send finish init physics data job exec on physics worker")

        postMessage({
            command: "FINISH_SEND_INIT_PHYSICS_DATA"
        })

        return worldState
    })
}
```

该Job向主线程发送结束初始化的指令



### 主线程的Update Pipeline的Job的代码

UpdateRenderDataBufferJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let state = getState(states)

	return mostService.callFunc(() => {
		console.log("update render data buffer job exec on main worker");

		let allGameObjects = getAllGameObjects(getExnFromStrictNull(worldState.ecsData.gameObjectManagerState));
		let renderDataBufferTypeArray = getExnFromStrictNull(state.renderDataBufferTypeArray)
		let renderGameObjectsCount = 0;
		let typeArrayIndex: number = 0;

		allGameObjects.forEach((gameObject) => {
			let material = getMaterialExn(getExnFromStrictNull(worldState.ecsData.basicMaterialComponentManagerState), gameObject)
			let transform = getTransformExn(getExnFromStrictNull(worldState.ecsData.transformComponentManagerState), gameObject)

			renderDataBufferTypeArray[typeArrayIndex * 2] = transform
			renderDataBufferTypeArray[typeArrayIndex * 2 + 1] = material

			renderGameObjectsCount++;
			typeArrayIndex++;
		})

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...state,
				renderDataBufferTypeArray,
				renderGameObjectsCount
			})
		)
	})
}
```

该Job更新了RenderWorkderData的Buffer的组件数据


SendBeginLoopDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { renderWorker, physicsWorker } = getState(states)

	return mostService.callFunc(() => {
		console.log("send begin loop data job exec on main worker")

		renderWorker = getExnFromStrictNull(renderWorker)
		physicsWorker = getExnFromStrictNull(physicsWorker)

		renderWorker.postMessage({
			command: "SEND_BEGIN_LOOP"
		})
		physicsWorker.postMessage({
			command: "SEND_BEGIN_LOOP"
		})

		return worldState
	})
}
```

该Job向渲染线程和物理线程发送开始主循环的指令
这两个线程在接收到指令后，会分别运行了渲染线程的Render Pipeline和物理线程的Update Pipeline


SendRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { renderWorker, renderGameObjectsCount } = getState(states)

	return mostService.callFunc(() => {
		console.log("send render data job exec on main worker")

		renderWorker = getExnFromStrictNull(renderWorker)
		renderGameObjectsCount = getExnFromStrictNull(renderGameObjectsCount)

		//假的相机数据
		let viewMatrix = new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0])
		let pMatrix = new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0])

		renderWorker.postMessage({
			command: "SEND_RENDER_DATA",
			camera: {
				viewMatrix,
				pMatrix
			},
			renderDataBuffer: {
				renderGameObjectCount: renderGameObjectsCount
			}
		})

		return worldState
	})
}
```

该Job向渲染线程发送渲染数据，包括相机数据、需要渲染的gameObject的个数


### 渲染线程的Render Pipeline的Job的代码

GetRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let viewMatrix: Float32Array
    let pMatrix: Float32Array
    let renderGameObjectsCount: number

    return createGetMainWorkerDataStream(
        mostService,
        (event: MessageEvent) => {
            viewMatrix = event.data.camera.viewMatrix
            pMatrix = event.data.camera.pMatrix
            renderGameObjectsCount = event.data.renderDataBuffer.renderGameObjectCount
        },
        "SEND_RENDER_DATA",
        self as any as Worker
    ).map(() => {
        console.log("get render data job exec on render worker")

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                viewMatrix: viewMatrix,
                pMatrix: pMatrix,
                renderGameObjectsCount: renderGameObjectsCount
            })
        )
    })
}
```

该Job获得主线程发送的渲染数据


SendUniformShaderDataJob
<!-- ```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let state = getState(states)

	return mostService.callFunc(() => {
		console.log("send uniform shader data job exec on render worker");

		let gl = getExnFromStrictNull(state.gl)

		let program = getExnFromStrictNull(state.program)

		sendCameraData(gl, getExnFromStrictNull(state.viewMatrix), getExnFromStrictNull(state.pMatrix), [program]);

		return worldState;
	})
}
``` -->

该Job代码除了是从主线程传来的渲染数据获得假的相机数据以外，其它都跟之前一样

RenderJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("render job exec on render worker")

        let gl = getExnFromStrictNull(state.gl)

        let renderDataBufferTypeArray = getExnFromStrictNull(state.typeArray);
        let renderGameObjectCount = getExnFromStrictNull(state.renderGameObjectsCount)

        //清空画布
        clear(gl)

        //渲染所有的gameObject
        range(0, renderGameObjectCount - 1).forEach(renderGameObjectIndex => {
            跟之前一样，渲染每个gameObject...
        })

        return worldState
    })
}
```

该Job代码除了是根据主线程传来的渲染数据构造场景中所有的gameObject以外，其它都跟之前一样

SendFinishRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
	return mostService.callFunc(() => {
		console.log("send finish render data job exec on render worker")

		postMessage({
			command: "FINISH_SEND_RENDER_DATA"
		})

		return worldState
	})
}
```

该Job向主线程发送结束指令



### 物理线程的Update Pipeline的Job的代码

ComputePhysicsJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("compute physics job exec on physics worker")

        let positions = getExnFromStrictNull(state.positions)

        computeAveragePositions(worldState, getExnFromStrictNull(state.allTransformIndices)).forEach(([transform, newPosition]) => {
            positions[transform * 3] = newPosition[0]
            positions[transform * 3 + 1] = newPosition[1]
            positions[transform * 3 + 2] = newPosition[2]
        })

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...state,
                positions
            })
        )
    })
}
```

该Job进行物理计算，将计算出的位置写到PhysicsWorkderData的Buffer中

SendFinishPhysicsDataJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
	return mostService.callFunc(() => {
		console.log("send finish physics data job exec on physics worker")

		postMessage({
			command: "FINISH_SEND_PHYSICS_DATA"
		})

		return worldState
	})
}
```

该Job向主线程发送结束指令



### 主线程的Sync Pipeline的Job的代码

GetFinishRenderDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { renderWorker } = getState(states)

	renderWorker = getExnFromStrictNull(renderWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_RENDER_DATA", renderWorker).map(() => {
		console.log("get finish render data job exec on main worker")

		return worldState
	})
}
```
该Job等待渲染线程发送结束指令


GetFinishPhysicsDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { physicsWorker } = getState(states)

	physicsWorker = getExnFromStrictNull(physicsWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_PHYSICS_DATA", physicsWorker).map(() => {
		console.log("get finish physics data job exec on main worker")

		return worldState
	})
}
```

该Job等待物理线程发送结束指令


UpdateAllTransformPositionsJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("update all transform positions job exec on main worker")

        worldState = _updateAllTransformPositions(worldState, getExnFromStrictNull(state.physicsDataBufferTypeArray))

        return worldState
    })
}
```

该Job使用物理线程中经过物理计算得到的值来更新所有TransformComponent组件的位置


UpdateTransformJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
    return mostService.callFunc(() => {
        console.log("update transform job exec on main worker")

        let transformComponentManagerState = batchUpdate(getExnFromStrictNull(worldState.ecsData.transformComponentManagerState))

        return {
            ...worldState,
            ecsData: {
                ...worldState.ecsData,
                transformComponentManagerState
            }
        }
    })
}
```

该Job更新所有TransformComponent组件的模型矩阵




### 运行代码

运行截图跟之前一样


值得注意的是：
因为使用了浏览器的SharedArrayBuffer API，所以需要启用浏览器的“跨域隔离”，打开Cross Origin

具体实现是在webpack的配置文件中定义下面的代码：
webpack.config.devserver.js
```ts
    devServer: {
        ...
        headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
        },
        ...
    },
```



<!-- # 设计意图

阐明模式的设计目标 -->

# 定义

## 一句话定义？

首先并行运行多个线程，然后同步更新主线程数据



## 补充说明

线程之间通过发送指令来调度

如果主线程以外的其它线程都只读主线程的数据，则不需要同步；
否则，首先需要拷贝写主线程的这部分数据；然后在需要写主线程的这部分数据的线程中，将新数据改为写到备份中；最后主线程在同步阶段，将自己的数据更新为备份中的新数据

渲染线程只读主线程的数据，其它线程则除了读以外还可能需要写主线程的数据

数据传送的方式主要有两种：拷贝、共享，其中共享主要是指共享SharedArrayBuffer和共享canvas


其它线程相比主线程是延迟了一帧的，这是因为主线程在同步阶段会更新自己的数据，而更新的数据只能在下一帧被其它线程使用


## 通用UML？
TODO tu


## 分析角色？

我们来看看模式的相关角色：

总体来看，分为Main Worker、X Worker这两个部分

Main Worker对应主线程，包括了运行在主线程的模块；
X Worker对应某个其它线程，包括了运行在该线程的模块


我们看下Main Worker这个部分：

- Client
该角色是用户

- WorldForMainWorker
该角色是门户，封装了API

- PipelineManager
该角色负责管理管道

- MainWorkerPipeline
该角色是注册的管道模块

- X Pipeline
该角色是一个管道

- Job
该角色是一段独立的逻辑


- Manager+Component+GameObject
该角色是ECS模式中的Manager层和Component+GameObject层，用来创建和管理场景
它包括的模块在ECS模式中已经介绍了，这里省略



我们看下X Worker这个部分：
它的模块结构跟Main Worker一样，只是用户、门户、管道模块、管道不一样




## 角色之间的关系？

- 因为可能有一个或多个其它线程，所以对应的有一个或多个X Worker

- 一个World注册了一个Pipeline
值得注意的是：如果需要同时支持单线程和多线程运行环境的话，那么就需要注册两个Pipeline，它们分别为单线程和多线程的管道模块

- 一个Pipeline有多个X Pipeline，如Init Pipeline、Update Pipeline等

- 一个X Pipeline有多个Job

- Job调用了Manager+Component+GameObject来读写场景数据

- World调用了Manager+Component+GameObject来创建场景



## 初始化流程图
TODO tu

## 分析角色？

总体来看，分为Main Worker、X Worker这两个部分

Main Worker包括了运行在主线程的Init Pipeline的Job，X Worker包括了运行在其它线程的Init Pipeline的Job


这些Init Pipeline是并行运行的


我们看下Main Worker这个部分：

- Create Worker Instance 
该Job创建了所有其它线程的worker

- Create XWorker Data Buffer
该Job创建了XWorkderData的Buffer（SharedArrayBuffer），用来保存主线程和X Worker线程之间需要共享的数据

- Send Init XWorker Data
这是多个Job，每个Job向对应的X Worker线程发送初始化数据

- Get Finish Send Init XWorker Data
这是多个Job，每个Job都并行执行，分别等待对应的X Worker线程发送过来的结束初始化的指令


我们看下X Worker这个部分：

- Get Init XWorker Data
该Job获得主线程发送的数据

- Init Data Oriented Components
该Job创建Data Oriented组件的Buffer的视图，从而能够通过视图读Buffer的数据

- Create XWorkre Data Buffer TypeArray
该Job创建XWorkerData的Buffer的视图，从而能够通过视图读写Buffer的数据


- Do Something
这是多个Job，每个Job实现一些逻辑，只应该更新该X Worker线程的数据

- Send Finish Init XWorker Data
该Job向主线程发送结束初始化的指定





## 角色之间的关系？

- Main Worker对应主线程

- 一个X Worker对应一个其它线程

- 主线程的“Create Worker Instance” Job在创建其它线程的worker后，会执行运行在该线程的用户代码，从而运行该线程的Init Pipeline

- 主线程的每个“Send Init XWorker Data” Job将数据发送到对应的一个其它线程；该其它线程的“Get Init XWorker Data” Job获得该数据

- 所有其它线程的“Send Finish Init XWorker Data” Job将结束指定发送到主线程；主线程的对应的“Get Finish Send Init XWorker Data” Job等待接收该指定



## 主循环流程图
TODO tu

## 分析角色？

总体来看，分为Main Worker、X Worker这两个部分

Main Worker包括了运行在主线程的Update Pipeline和Sync Pipeline的Job，X Worker包括了运行在其它线程的X Pipeline的Job

<!-- 主线程的Update Pipeline和其它线程的X Pipeline是并行运行的；
主线程的Sync Pipeline是单独运行的
 -->

首先并行运行了主线程的Update Pipeline、其它线程的X Pipeline；
然后运行了主线程的Sync Pipeline

我们看下Main Worker这个部分：

Main Worker首先运行了主线程的Update Pipeline，我们看下相关的Job： 

- Update XWorker Data Buffer
该Job更新了XWorkderData的Buffer中的数据

- Send Begin Loop Data
该Job向所有的其它线程发送开始主循环的指令

- Send XWorker Data
这是多个Job，每个Job向对应的X Worker线程发送数据

- Do Something
这是多个Job，每个Job实现一些逻辑，只应该更新主线程的数据



Main Worker接着运行了主线程的Sync Pipeline，我们看下相关的Job：

- Get Finish XWorker Data
这是多个Job，每个Job都并行执行，分别等待对应的X Worker线程发送过来的结束指令

- Update Shared Data
这是多个Job，每个Job都更新在线程之间共享的主线程的数据

 
我们看下X Worker这个部分：

- Get XWorker Data
该Job获得主线程发送的数据

- Do Something
这是多个Job，每个Job实现一些逻辑，只应该更新该X Worker线程的数据

- Send Finish XWorker Data
该Job向主线程发送结束的指定


## 角色之间的关系？

- Main Worker对应主线程

- 一个X Worker对应一个其它线程

- 其它线程接收到主线程的“Send Begin Loop Data” Job发送的开始主循环的指令后，开始运行自己的X Pipeline

- 主线程的每个“Send XWorker Data” Job将数据发送到对应的一个其它线程；该其它线程的“Get XWorker Data” Job获得该数据

- 所有其它线程的“Send Finish XWorker Data” Job将结束指定发送到主线程；主线程的对应的“Get Finish Send XWorker Data” Job等待接收该指定




## 角色的抽象代码？

下面我们来看看各个角色的抽象代码：


首先，我们看下主线程中用户的代码；
然后，我们看下主线程在初始化阶段运行的Init Pipeline的Job的代码；
然后，我们看下X Worker线程中用户的代码；
然后，我们看下X Worker线程在初始化阶段运行的Init Pipeline的Job的代码；

在看完了初始化阶段后，我们就会看下主循环阶段的相关代码，具体步骤如下：
首先，我们看下主线程的Update Pipeline的Job的代码；
然后，我们看下X Worker线程的X Pipeline的Job的代码；
最后，我们看下主线程的Sync Pipeline的Job的代码；





- 主线程中用户的代码
Client
```ts
let isUseWorker = true

let dataOrientedComponent1Count = xxx

globalThis.dataOrientedComponent1Count = dataOrientedComponent1Count

globalThis.maxRenderGameObjectCount = xxx


let worldState = createState({ dataOrientedComponent1Count })

worldState = _createScene(worldState)

if (isUseWorker) {
    worldState = registerWorkerAllPipelines(worldState)
}
else {
    console.log("registerNoWorkerAllPipelines...")
}

let canvas = document.querySelector("#canvas")



let _loop = (worldState: worldState) => {
    update(worldState).then(worldState => {
        let handlePromise

        if (isUseWorker) {
            handlePromise = sync(worldState)
        }
        else {
            handlePromise = render(worldState)
        }

        handlePromise.then(worldState => {
            console.log("after sync")

            requestAnimationFrame(
                (time) => {
                    _loop(worldState)
                }
            )
        })
    })
}

init(worldState, canvas).then(worldState => {
    _loop(worldState)
})
```

- 主线程在初始化阶段运行的Init Pipeline的Job的代码
CreateWorkerInstanceJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    return mostService.callFunc(() => {
        let xWorkerWorker = new Worker(new URL("../../../x_worker/XWorkerMain", import.meta.url))

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                xWorkerWorker
            })
        )
    })
}
```
CreateXWorkerDataBufferJob
```ts
let _getMaxXxxCount = () => (globalThis as any).xxx

let _getStride = () => xxx

export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	return mostService.callFunc(() => {
		let buffer = new SharedArrayBuffer(
			_getMaxXxxCount() * _getStride()
		)

		let xWorkerDataBufferTypeArray = new Float32Array | Uint8Array | Uint16Array | Uint32Array(buffer)

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...getState(states),
				xWorkerDataBuffer: buffer,
				xWorkerDataBufferTypeArray: xWorkerDataBufferTypeArray
			})
		)
	})
}
```
SendInitXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { xWorkerWorker, xWorkerDataBuffer } = getState(states)

	return mostService.callFunc(() => {
		xWorkerWorker = getExnFromStrictNull(xWorkerWorker)

		let dataOrientedComponent1Count = (globalThis as any).dataOrientedComponent1Count

		let allDataOrientedComponent1Indices = getAllDataOrientedComponent1s(getExnFromStrictNull(worldState.ecsData.dataOrientedComponent1ManagerState))

		xWorkerWorker.postMessage({
			command: "SEND_INIT_XWORKER_DATA",
			xWorkerDataBuffer: getExnFromStrictNull(xWorkerDataBuffer),
			allDataOrientedComponent1Indices: allDataOrientedComponent1Indices,
			dataOrientedComponent1Count,
			dataorientedComponent1Buffer: getExnFromStrictNull(worldState.ecsData.dataOrientedComponent1ManagerState).buffer,
			otherData: xxx
		})

		return worldState
	})
}
```
GetFinishSendInitXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { xWorkerWorker } = getState(states)

	xWorkerWorker = getExnFromStrictNull(xWorkerWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_INIT_XWORKER_DATA", xWorkerWorker).map(() => {
		return worldState
	})
}
```

### X Worker线程中用户的代码

XWorkerMain
```ts
let _frame = (worldState: worldState) => {
	return pipelineWhenLoop(worldState)
}

let _registerAllPipelines = (worldState: worldState): worldState => {
	let pipelineManagerState = registerPipeline(
		unsafeGetPipeManagerState(worldState),
		getXWorkerPipeline(),
		[]
	)

	return setPipeManagerState(worldState, pipelineManagerState)
}

let worldState = createStateForWorker()

worldState = _registerAllPipelines(worldState)


let tempWorldState: worldState | null = null

init(worldState).then(worldState => {
	tempWorldState = worldState
})

mostService.drain(
	mostService.tap(
		(_) => {
			_frame(getExnFromStrictNull(tempWorldState)).then((worldState) => {
				tempWorldState = worldState
			})
		},
		mostService.filter(
			(event) => {
				return event.data.command === "SEND_BEGIN_LOOP";
			},
			mostService.fromEvent<MessageEvent, Window & typeof globalThis>("message", self, false)
		)
	)
)
```


### X Worker线程在初始化阶段运行的Init Pipeline的Job的代码

GetInitXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let xWorkerDataBuffer: SharedArrayBuffer
    let allDataOrientedComponent1Indices: Array<number>
    let dataOrientedComponent1Count: number
    let dataOrientedComponent1Buffer: SharedArrayBuffer
    let otherData

    return createGetMainWorkerDataStream(
        mostService,
        (event: MessageEvent) => {
            xWorkerDataBuffer = event.data.xWorkerDataBuffer
            allDataOrientedComponent1Indices = event.data.allDataOrientedComponent1Indices
            dataOrientedComponent1Count = event.data.dataOrientedComponent1Count
            dataOrientedComponent1Buffer = event.data.dataOrientedComponent1Buffer
            otherData = event.data.otherData
        },
        "SEND_INIT_XWORKER_DATA",
        self as any as Worker
    ).map(() => {
        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                xWorkerDataBuffer: xWorkerDataBuffer,
                allDataOrientedComponent1Indices: allDataOrientedComponent1Indices,
                dataOrientedComponent1Count: dataOrientedComponent1Count,
                dataOrientedComponent1Buffer: dataOrientedComponent1Buffer,
                otherData: otherData
            })
        )
    })
}
```
InitDataOrientedComponentsJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let { dataOrientedComponent1Count, dataOrientedComponent1Buffer } = getState(states)

    return mostService.callFunc(() => {
        return createDataOrientedComponentStates(worldState, dataOrientedComponent1Count, dataOrientedComponent1Buffer)
    })
}
```
CreateXWorkerDataBufferTypeArrayJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        let xWorkerDataBufferTypeArray = new Float32Array | Uint8Array | Uint16Array | Uint32Array(getExnFromStrictNull(state.xWorkerDataBuffer))

        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...state,
                typeArray: xWorkerDataBufferTypeArray
            })
        )
    })
}
```
DoSomethingJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    return mostService.callFunc(() => {
        console.log("do something")

        // update self data
        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                xxx: xxx
            })
        )
    })
}
```
SendFinishInitXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
    return mostService.callFunc(() => {
        postMessage({
            command: "FINISH_SEND_INIT_XWORKER_DATA"
        })

        return worldState
    })
}
```

### 主线程的Update Pipeline的Job的代码

UpdateXWorkerDataBufferJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let state = getState(states)

	return mostService.callFunc(() => {
		console.log("update xWorkerDataBufferTypeArray")

		return setStatesFunc<worldState, states>(
			worldState,
			setState(states, {
				...state,
				xWorkerDataBufferTypeArray
			})
		)
	})
}
```
SendBeginLoopDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { xWorkerWorker } = getState(states)

	return mostService.callFunc(() => {
		xWorkerWorker = getExnFromStrictNull(xWorkerWorker)

		xWorkerWorker.postMessage({
			command: "SEND_BEGIN_LOOP"
		})

		return worldState
	})
}
```
SendXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { xWorkerWorker } = getState(states)

	return mostService.callFunc(() => {
		xWorkerWorker = getExnFromStrictNull(xWorkerWorker)

		xWorkerWorker.postMessage({
			command: "SEND_XWORKER_DATA",
			someData:xxx
		})

		return worldState
	})
}
```
DoSomethingJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    return mostService.callFunc(() => {
        console.log("do something")

        // update self data
        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                xxx: xxx
            })
        )
    })
}
```


### X Worker线程的X Pipeline的Job的代码


GetXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let someData

    return createGetMainWorkerDataStream(
        mostService,
        (event: MessageEvent) => {
            someData = event.data.someData
        },
        "SEND_XWORKER_DATA",
        self as any as Worker
    ).map(() => {
        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                someData
            })
        )
    })
}
```
DoSomethingJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc, setStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    return mostService.callFunc(() => {
        console.log("do something")

        // update self data
        return setStatesFunc<worldState, states>(
            worldState,
            setState(states, {
                ...getState(states),
                xxx: xxx
            })
        )
    })
}
```
SendFinishXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, _) => {
	return mostService.callFunc(() => {
		postMessage({
			command: "FINISH_SEND_XWORKER_DATA"
		})

		return worldState
	})
}
```


### 主线程的Sync Pipeline的Job的代码

GetFinishXWorkerDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { xWorkerWorker } = getState(states)

	xWorkerWorker = getExnFromStrictNull(xWorkerWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_XWORKER_DATA", xWorkerWorker).map(() => {
		return worldState
	})
}
```
UpdateSharedDataJob
```ts
export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
    let states = getStatesFunc<worldState, states>(worldState)

    let state = getState(states)

    return mostService.callFunc(() => {
        console.log("update shared data between workers: e.g. data oriented component1's typeArrays")

        return worldState
    })
}
```






## 遵循的设计原则在UML中的体现？


TODO finish


# 应用

## 优点

- 提高了性能


## 缺点

- 需要同时维护单线程和多线程的这两套代码
好消息是因为使用了管道模式，所以进行了充分的解耦，使得这两套代码互不影响

- 需要考虑考虑线程之间的同步
好消息是不需要锁，而是通过共享和备份来实现同步，这样更易于维护且性能更高
要实现这种同步的话，可从下面几个方面来考虑：
共享的数据尽量使用不可变数据，因为修改它不需要同步；
其它线程尽量只读主线程的数据，这样就不需要同步；
设计同步时，从数据的角度出发，识别出主线程哪些数据会被其它线程写；然后备份这些数据，并让其它线程写该备份数据；最后在同步时从备份中更新主线程数据


## 使用场景

### 场景描述

需要渲染大型场景或者有并行逻辑的系统

### 具体案例

- 需要渲染大型场景

可以将渲染的逻辑从主线程移到一个渲染线程来并行地执行

- 开多个线程来并行地执行一些逻辑，如加载超大模型、进行复杂计算等逻辑
可以开一个线程去加载超大模型，开另一个线程去进行复杂计算；
每帧的最后在主线程进行同步




## 注意事项

- 如果其它线程需要写主线程的数据，则需要同步

- 使用SharedArrayBuffer时，需要启用跨域隔离


# 扩展

- 如果材质有纹理，则需要将纹理图片从主线程传到渲染线程，这可以通过浏览器的transferFromImageBitmap API来传送该图片

- 如果是现代图形API，如DX12/Vulkan/Metal/WebGPU，则支持开多个而不是一个渲染线程来渲染


# 结合其它模式

## 结合哪些模式？

## 结合ECS模式

使用ECS模式中的Manager层和Component+GameObject层来创建和管理场景




## 结合管道模式

在单线程、多线程运行环境下分别注册不同的管道来实现对应的逻辑



<!-- ## 使用场景是什么？
## UML如何变化？
## 代码如何变化？ -->




# 最佳实践

<!-- ## 结合具体项目实践经验，如何应用模式来改进项目？ -->
## 哪些场景不需要使用模式？


如果场景较小，或者没有并行逻辑，则不需要使用多线程模式来开多个线程，而只使用主线程即可

<!-- ## 哪些场景需要使用模式？ -->
## 给出具体的实践案例？


- 延迟删除

因为删除场景数据（如删除一个组件或者gameObject）会影响主线程的场景数据，所以应该这样处理：
删除场景数据的API并没有真正地进行删除，而只是将要删除的数据标记为删除；
然后等到同步阶段（也就是运行主线程的Sync Pipeline时）再真正地将其删除


- 通过切换管道，来同时支持单线程和多线程的运行环境



# 更多资料推荐


因为游戏的场景一般都比较大，所以游戏引擎一般都支持多线程


顽皮狗在GDC上提出了Fiber架构，使用了管道模式，支持多线程，具体可在网上搜索“Parallelizing the Naughty Dog Engine using Fibers”
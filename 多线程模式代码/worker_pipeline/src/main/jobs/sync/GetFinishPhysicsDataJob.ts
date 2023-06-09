import { state as worldState } from "mutltithread_pattern_world/src/WorldStateType"
import { service as mostService } from "most/src/MostService"
import { getState } from "../Utils"
import { exec as execType } from "pipeline_manager/src/type/PipelineType"
import { states } from "worker_pipeline_state_type/src/main/StateType"
import { createGetOtherWorkerDataStream } from "../../../CreateWorkerDataStreamUtils"
import { getExnFromStrictNull } from "commonlib-ts/src/NullableUtils"

export let exec: execType<worldState> = (worldState, { getStatesFunc }) => {
	let states = getStatesFunc<worldState, states>(worldState)

	let { physicsWorker } = getState(states)

	physicsWorker = getExnFromStrictNull(physicsWorker)

	return createGetOtherWorkerDataStream(mostService, "FINISH_SEND_PHYSICS_DATA", physicsWorker).map(() => {
		console.log("get finish physics data job exec on main worker")

		return worldState
	})
}

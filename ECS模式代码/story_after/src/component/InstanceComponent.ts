import { state as instanceComponentState } from "./InstanceComponentStateType"

export let create = (): instanceComponentState => {
    let instanceComponentState: instanceComponentState = {
        gameObject: null
    }

    return instanceComponentState
}
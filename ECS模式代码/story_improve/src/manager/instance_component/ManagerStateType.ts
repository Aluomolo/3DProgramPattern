import { Map } from "immutable";
import { component } from "../../component/InstanceComponentType";
import { gameObject } from "../../gameObject/GameObjectType";

export type state = {
    maxUID: number,
    gameObjectMap: Map<component, gameObject>,
    gameObjectInstanceMap: Map<gameObject, component>,
}
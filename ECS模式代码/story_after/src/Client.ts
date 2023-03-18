import { api, addGameObject, createState, init, loop } from "./world/World";
import { state as worldState } from "./world/WorldStateType";

let _createScene = (worldState: worldState): worldState => {
    let normalHeroData1 = api.gameObject.create()
    let normalHero1State = normalHeroData1[0]
    let normalHero1 = normalHeroData1[1]

    let positionComponent1 = api.positionComponent.create()
    let velocityComponent1 = api.velocityComponent.create()
    let instanceComponent1 = api.instanceComponent.create()

    normalHero1State = api.gameObject.setPositionComponent(normalHero1State, normalHero1, positionComponent1)
    normalHero1State = api.gameObject.setVelocityComponent(normalHero1State, normalHero1, velocityComponent1)
    normalHero1State = api.gameObject.setInstanceComponent(normalHero1State, normalHero1, instanceComponent1)

    worldState = addGameObject(worldState, [normalHero1State, normalHero1])


    let normalHeroData2 = api.gameObject.create()
    let normalHero2State = normalHeroData2[0]
    let normalHero2 = normalHeroData2[1]

    let positionComponent2 = api.positionComponent.create()
    let velocityComponent2 = api.velocityComponent.create()
    let instanceComponent2 = api.instanceComponent.create()

    normalHero2State = api.gameObject.setPositionComponent(normalHero2State, normalHero2, positionComponent2)
    normalHero2State = api.gameObject.setVelocityComponent(normalHero2State, normalHero2, velocityComponent2)
    normalHero2State = api.gameObject.setInstanceComponent(normalHero2State, normalHero2, instanceComponent2)

    worldState = addGameObject(worldState, [normalHero2State, normalHero2])


    worldState = api.positionComponent.move(worldState, normalHero1)



    let superHeroData1 = api.gameObject.create()
    let superHero1State = superHeroData1[0]
    let superHero1 = superHeroData1[1]

    let positionComponent3 = api.positionComponent.create()
    let velocityComponent3 = api.velocityComponent.create()
    let flyComponent1 = api.flyComponent.create()

    superHero1State = api.gameObject.setPositionComponent(superHero1State, superHero1, positionComponent3)
    superHero1State = api.gameObject.setVelocityComponent(superHero1State, superHero1, velocityComponent3)
    superHero1State = api.gameObject.setFlyComponent(superHero1State, superHero1, flyComponent1)

    worldState = addGameObject(worldState, [superHero1State, superHero1])


    let superHeroData2 = api.gameObject.create()
    let superHero2State = superHeroData2[0]
    let superHero2 = superHeroData2[1]

    let positionComponent4 = api.positionComponent.create()
    let velocityComponent4 = api.velocityComponent.create()
    let flyComponent2 = api.flyComponent.create()

    superHero2State = api.gameObject.setPositionComponent(superHero2State, superHero2, positionComponent4)
    superHero2State = api.gameObject.setVelocityComponent(superHero2State, superHero2, velocityComponent4)
    superHero2State = api.gameObject.setFlyComponent(superHero2State, superHero2, flyComponent2)

    worldState = addGameObject(worldState, [superHero2State, superHero2])


    worldState = api.positionComponent.move(worldState, superHero1)
    worldState = api.flyComponent.fly(worldState, superHero1)



    return worldState
}

let worldState = createState()

worldState = _createScene(worldState)

worldState = init(worldState)

loop(worldState)
let createEmpty = (~hintSize=10, ()): CommonlibType.SparseMapType.t2<'a> => []

let copy = Js.Array.copy

let unsafeGet = (map: CommonlibType.SparseMapType.t2<'a>, key: int): 'a =>
  Array.unsafe_get(map, key)->CommonlibType.SparseMapType.nullableToNotNullable

let get = (map, key: int) => {
  let value = unsafeGet(map, key)

  NullUtils.isEmpty(value) ? None : Some(value)
}

// let getNullable = (map, key) => get(map, key)->Js.Nullable.fromOption
// let getNullable = (map, key) => Array.unsafe_get(map, key)
let getNullable = (map, key) => unsafeGet(map, key)->Js.Nullable.return

let has = (map, key: int) => !NullUtils.isEmpty(unsafeGet(map, key))

let map = (map, func) => map->Js.Array.map(value =>
    if NullUtils.isNotInMap(value) {
      Js.Nullable.undefined
    } else {
      func(.
        value->CommonlibType.SparseMapType.nullableToNotNullable,
      )->CommonlibType.SparseMapType.notNullableToNullable
    }
  , _)

let reducei = (map, func, initValue) =>
  map->ArraySt.reduceOneParami((. previousValue, value, index) =>
    if NullUtils.isNotInMap(value) {
      previousValue
    } else {
      func(.
        previousValue->CommonlibType.SparseMapType.nullableToNotNullable,
        value->CommonlibType.SparseMapType.nullableToNotNullable,
        index,
      )->CommonlibType.SparseMapType.notNullableToNullable
    }
  , initValue->CommonlibType.SparseMapType.notNullableToNullable)->CommonlibType.SparseMapType.nullableToNotNullable

let getValues = map =>
  map
  ->Js.Array.filter(value => NullUtils.isInMap(value), _)
  ->CommonlibType.SparseMapType.arrayNullableToArrayNotNullable

let getKeys = map => map->ArraySt.reduceOneParami((. arr, value, key) =>
    if NullUtils.isNotInMap(value) {
      arr
    } else {
      arr->Js.Array.push(key, _)->ignore
      arr
    }
  , [])

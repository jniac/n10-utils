import { Hash } from '../hash'

type Primitive = boolean | number | BigInt | string | Symbol

function isPrimitive(value: any): value is Primitive {
  if (value === null || value === undefined) {
    return true
  }
  switch (typeof value) {
    case 'function':
    case 'object': {
      return false
    }
    default: {
      return true
    }
  }
}

/**
 * Returns a unique id (session based) for any given values, which could be 
 * - primitives
 * - object
 * - a combination of the two (array)
 */
export class IdRegister {
  private _count = 0
  private _map = new Map<Primitive, number>()
  private _weakMap = new WeakMap<object, number>()
  private _getId(): number {
    return Hash.init().update(++this._count).getValue()
  }
  private _registerObject(value: object): number {
    const id = this._getId()
    this._weakMap.set(value, id)
    return id
  }
  private _registerPrimitive(value: Primitive): number {
    const id = this._getId()
    this._map.set(value, id)
    return id
  }
  private _requirePrimitiveId(value: Primitive) {
    return this._map.get(value) ?? this._registerPrimitive(value)
  }
  private _requireObjectId(value: object) {
    return this._weakMap.get(value) ?? this._registerObject(value)
  }
  private _requireArrayId(value: any[]) {
    Hash.init()
    for (const item of value.flat(16)) {
      Hash.update(this.requireId(item))
    }
    return Hash.getValue()
  }
  requireId(value: any): number {
    return (isPrimitive(value)
      ? this._requirePrimitiveId(value)
      : Array.isArray(value)
        ? this._requireArrayId(value)
        : this._requireObjectId(value))
  }
}

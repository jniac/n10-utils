import { digest } from '../digest'

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
  private count = 0;
  private map = new Map<Primitive, number>();
  private weakMap = new WeakMap<object, number>();
  private registerObject(value: object): number {
    this.weakMap.set(value, ++this.count)
    return this.count
  }
  private registerPrimitive(value: Primitive): number {
    this.map.set(value, ++this.count)
    return this.count
  }
  private requirePrimitiveId(value: Primitive) {
    return this.map.get(value) ?? this.registerPrimitive(value)
  }
  private requireObjectId(value: object) {
    return this.weakMap.get(value) ?? this.registerObject(value)
  }
  private requireArrayId(value: any[]) {
    digest.init()
    for (const item of value.flat(16)) {
      digest.next(this.requireId(item))
    }
    return digest.resultAsInt()
  }
  requireId(value: any): number {
    return (isPrimitive(value)
      ? this.requirePrimitiveId(value)
      : Array.isArray(value)
        ? this.requireArrayId(value)
        : this.requireObjectId(value))
  }
}

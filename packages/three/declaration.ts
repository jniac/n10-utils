import { Vector2, Vector3 } from 'three'

export type Vector3Declaration =
  | number
  | [x: number, y: number, z: number]
  | { x: number; y: number; z: number }
  | { width: number; height: number; depth: number }

export type Vector2Declaration =
  | number
  | [x: number, y: number]
  | { x: number; y: number }
  | { width: number; height: number }

export function solveVector3Declaration(arg: Vector3Declaration, out: Vector3 = new Vector3()): Vector3 {
  if (typeof arg === 'number') {
    return out.set(arg, arg, arg)
  }
  if (Array.isArray(arg)) {
    const [x, y, z] = arg
    return out.set(x, y, z)
  }
  if ('width' in arg) {
    const { width, height, depth } = arg
    return out.set(width, height, depth)
  }
  const { x, y, z } = arg
  return out.set(x, y, z)
}

export function solveVector2Declaration(arg: Vector2Declaration, out: Vector2 = new Vector2()): Vector2 {
  if (typeof arg === 'number') {
    return out.set(arg, arg)
  }
  if (Array.isArray(arg)) {
    const [x, y] = arg
    return out.set(x, y)
  }
  if ('width' in arg) {
    const { width, height } = arg
    return out.set(width, height)
  }
  const { x, y } = arg
  return out.set(x, y)
}

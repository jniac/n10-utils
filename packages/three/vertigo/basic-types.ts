
export type Vector3Declaration = number | [x: number, y: number, z: number] | { x: number; y: number; z: number}  | { width: number; height: number; depth: number} 
export type Vector2Declaration = number | [x: number, y: number] | { x: number; y: number}  | { width: number; height: number} 

export function solveVector3Declaration(arg: Vector3Declaration): [x: number, y: number, z: number] {
  if (typeof arg === 'number') {
    return [arg, arg, arg]
  }
  if (Array.isArray(arg)) {
    return arg
  }
  if ('width' in arg) {
    const { width, height, depth } = arg
    return [width, height, depth]
  }
  const { x, y, z } = arg
  return [x, y, z]
}

export function solveVector2Declaration(arg: Vector2Declaration): [x: number, y: number] {
  if (typeof arg === 'number') {
    return [arg, arg]
  }
  if (Array.isArray(arg)) {
    return arg
  }
  if ('width' in arg) {
    const { width, height } = arg
    return [width, height]
  }
  const { x, y } = arg
  return [x, y]
}

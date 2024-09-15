// @ts-ignore
import { Euler, Matrix4, Object3D, Quaternion, Vector2, Vector3 } from 'three'

/**
 * Because readonly types are compatible with their mutable counterparts, we can use this type to handle both cases.
 */
type ReadonlyOrNot<T> = T | Readonly<T>

type Vector2DeclarationBase =
  | number
  | [x: number, y: number]
  | { x: number; y: number }
  | { width: number; height: number }

export type Vector2Declaration = ReadonlyOrNot<Vector2DeclarationBase>

type Vector3DeclarationBase =
  | number
  | [x: number, y: number, z?: number]
  | { x: number; y: number; z?: number }
  | { width: number; height: number; depth: number }

export type Vector3Declaration = ReadonlyOrNot<Vector3DeclarationBase>

type EulerDeclarationBase =
  | [x: number, y: number, z: number, order?: Euler['order']]
  | { x: number; y: number; z: number; order?: Euler['order']; useDegree?: boolean }

export type EulerDeclaration = ReadonlyOrNot<EulerDeclarationBase>

export type TransformDeclaration = Partial<{
  x: number
  y: number
  z: number
  position: Vector3Declaration

  rotationX: number
  rotationY: number
  rotationZ: number
  rotation: EulerDeclaration
  rotationOrder: Euler['order']
  useDegree: boolean

  scale: Vector3Declaration
  scaleX: number
  scaleY: number
  scaleZ: number
  scaleScalar: number
}>

export function isVector2Declaration(arg: any): arg is Vector2Declaration {
  if (typeof arg === 'number') return true
  if (Array.isArray(arg)) return arg.length >= 2 && arg.length <= 3 && arg.every(v => typeof v === 'number')
  if (typeof arg === 'object') {
    if ('x' in arg && 'y' in arg) return true
    if ('width' in arg && 'height' in arg) return true
  }
  return false
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
  const { x, y } = arg as { x: number; y: number }
  return out.set(x, y)
}

export function isVector3Declaration(arg: any): arg is Vector3Declaration {
  if (typeof arg === 'number') return true
  if (Array.isArray(arg)) return arg.length >= 2 && arg.length <= 3 && arg.every(v => typeof v === 'number')
  if (typeof arg === 'object') {
    if ('x' in arg && 'y' in arg) return true
    if ('width' in arg && 'height' in arg) return true
  }
  return false
}

export function solveVector3Declaration(arg: Vector3Declaration, out: Vector3 = new Vector3()): Vector3 {
  if (typeof arg === 'number') {
    return out.set(arg, arg, arg)
  }
  if (Array.isArray(arg)) {
    const [x, y, z = 0] = arg
    return out.set(x, y, z)
  }
  if ('width' in arg) {
    const { width, height, depth } = arg
    return out.set(width, height, depth)
  }
  const { x, y, z = 0 } = arg as { x: number; y: number; z?: number }
  return out.set(x, y, z)
}

export function solveEulerDeclaration(arg: EulerDeclaration, out: Euler = new Euler()): Euler {
  if (Array.isArray(arg)) {
    const [x, y, z, order = 'XYZ'] = arg
    return out.set(x, y, z, order)
  }
  const { x, y, z, order = 'XYZ', useDegree = false } = arg
  const s = useDegree ? Math.PI / 180 : 1
  return out.set(x * s, y * s, z * s, order)
}

export const solveTransformDeclaration = (() => {
  const _position = new Vector3()
  const _rotation = new Euler()
  const _quaternion = new Quaternion()
  const _scale = new Vector3()

  function solveTransformDeclaration(props: TransformDeclaration, out: Matrix4): Matrix4
  function solveTransformDeclaration<T extends Object3D>(props: TransformDeclaration, out: T): T
  function solveTransformDeclaration(props: TransformDeclaration, out: any): any {
    const {
      x = 0,
      y = 0,
      z = 0,
      position = { x, y, z },

      rotationX = 0,
      rotationY = 0,
      rotationZ = 0,
      rotationOrder = 'XYZ',
      rotation = { x: rotationX, y: rotationY, z: rotationZ, order: rotationOrder },
      useDegree = false,

      scaleX = 1,
      scaleY = 1,
      scaleZ = 1,
      scaleScalar = 1,
      scale = { x: scaleX, y: scaleY, z: scaleZ },
    } = props

    _rotation.set(rotationX, rotationY, rotationZ, rotationOrder)

    if (useDegree) {
      const s = Math.PI / 180
      _rotation.x *= s
      _rotation.y *= s
      _rotation.z *= s
    }

    solveVector3Declaration(position, _position)
    solveEulerDeclaration(rotation, _rotation)
    solveVector3Declaration(scale, _scale).multiplyScalar(scaleScalar)

    if (out instanceof Matrix4) {
      return out.compose(_position, _quaternion.setFromEuler(_rotation), _scale)
    }

    function isObject3D(obj: any): obj is Object3D {
      return obj && typeof obj.position === 'object' && typeof obj.quaternion === 'object' && typeof obj.scale === 'object'
    }
    if (isObject3D(out)) {
      out.position.copy(_position)
      out.quaternion.setFromEuler(_rotation)
      out.scale.copy(_scale)
      return out
    }

    throw new Error(`Invalid out argument (${out.constructor.name})`)
  }
  return solveTransformDeclaration
})()
// @ts-ignore
import { Euler, EulerOrder, Matrix4, Quaternion, Vector3 } from 'three'

export type MatrixParams = Partial<{
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  /** Specify directly the quaternion (instead of using euler rotation). */
  q: Quaternion
  rotationOrder: EulerOrder
  useDegree: boolean
  s: number
  sx: number
  sy: number
  sz: number
}>

export function getMatrixMaker({
  defaultRotationOrder = <EulerOrder>'XYZ',
  defaultUseDegree = true,

  // internal, intermediate values
  euler = new Euler(),
  translate = new Vector3(),
  quaternion = new Quaternion(),
  scale = new Vector3(),
  matrix = new Matrix4(),
} = {}) {
  return function makeMatrix(params: MatrixParams, out: Matrix4 = matrix) {
    const {
      x = 0,
      y = 0,
      z = 0,
      rx = 0,
      ry = 0,
      rz = 0,
      rotationOrder = defaultRotationOrder,
      useDegree = defaultUseDegree,
      q = undefined,
      s = 1,
      sx = 1,
      sy = 1,
      sz = 1,
    } = params
    const a = useDegree ? Math.PI / 180 : 1
    if (q) {
      quaternion.copy(q)
    } else {
      quaternion.setFromEuler(euler.set(rx * a, ry * a, rz * a, rotationOrder as EulerOrder))
    }
    translate.set(x, y, z)
    scale.set(s * sx, s * sy, s * sz)
    return out.identity().compose(translate, quaternion, scale)
  }
}

export const makeMatrix = getMatrixMaker()

import { Matrix4, Vector3 } from 'three'

/**
 * Because ThreeJS lacks a solution to apply the "rotation" part of a matrix4...
 * https://github.com/mrdoob/three.js/blob/master/src/math/Vector3.js#L218-L229
 */
export function applyMatrix4AsMatrix3(v: Vector3, m: Matrix4): Vector3 {
  const { x, y, z } = v
  const { elements: e } = m

  v.x = e[0] * x + e[4] * y + e[8] * z
  v.y = e[1] * x + e[5] * y + e[9] * z
  v.z = e[2] * x + e[6] * y + e[10] * z

  return v
}

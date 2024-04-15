import { Matrix4, Vector3 } from 'three'

/**
 * Transform points from a plane to a sphere.
 */
export function getSpherizer(matrix: Matrix4) {
  const _m = matrix.clone()
  const _im = matrix.clone().invert()
  const _local = new Vector3()
  const _u = new Vector3()
  const _v = new Vector3()
  const _w = new Vector3(0, 0, 1)

  function getMatrix(matrix: Matrix4) {
    matrix.copy(_m)
  }

  function setMatrix(matrix: Matrix4) {
    _m.copy(matrix)
    _im.copy(matrix).invert()
  }

  function transform(radius: number, point: Vector3, out = point): Vector3 {
    if (radius > 1000000000000) {
      return out.copy(point)
    }
    const { x, y, z } = _local.copy(point).applyMatrix4(_im)
    const d = Math.sqrt(x * x + y * y)
    if (d < 1e-9) {
      return out.copy(point)
    }
    _u.set(x / d, y / d, 0)
    _v.crossVectors(_w, _u).normalize()
    const a = d / (radius + z)
    out.set(0, 0, radius)
      .addScaledVector(_u, (radius - z) * Math.sin(a))
      .addScaledVector(_w, (radius - z) * -Math.cos(a))
    return out.applyMatrix4(_m)
  }

  return {
    getMatrix,
    setMatrix,
    transform,
  }
}

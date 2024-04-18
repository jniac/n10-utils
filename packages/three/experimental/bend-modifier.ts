import { Matrix4, Vector3 } from 'three'

/**
 * Returns a function that can be used to apply a bend modifier to points.
 */
export function getBendModifier(matrix: Matrix4) {
  const _m = matrix.clone()
  const _im = matrix.clone().invert()
  const _local = new Vector3()
  const _u = new Vector3()
  const _v = new Vector3()
  const _w = new Vector3(0, 0, 1)

  return {
    getMatrix: (matrix: Matrix4) => {
      matrix.copy(_m)
    },

    setMatrix: (matrix: Matrix4) => {
      _m.copy(matrix)
      _im.copy(matrix).invert()
    },

    applySphere: (radius: number, point: Vector3, out = point): Vector3 => {
      if (radius > 1e12) {
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
    },

    applyCurvatureApprox: (radiusX: number, radiusY: number, point: Vector3, out = point): Vector3 => {
      const { x, y, z } = _local.copy(point).applyMatrix4(_im)
      const ax = x / (radiusX + z)
      const ay = y / (radiusY + z)
      const ox = radiusX < 1e12 ? (radiusX - z) * Math.sin(ax) : x
      const oy = radiusY < 1e12 ? (radiusY - z) * Math.sin(ay) : y
      const ozX = radiusX < 1e12 ? radiusX - (radiusX - z / 2) * Math.cos(ax) : z / 2
      const ozY = radiusY < 1e12 ? radiusY - (radiusY - z / 2) * Math.cos(ay) : z / 2
      out.set(
        ox,
        oy,
        ozX + ozY,
      )
      return out.applyMatrix4(_m)
    },
  }
}

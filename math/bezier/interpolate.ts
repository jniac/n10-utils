import { Point3Like, PointLike } from '../../types'

export function quadraticBezier(a: number, b: number, c: number, t: number): number {
  return (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c
}

export function quadraticBezier2(out: PointLike, A: PointLike, B: PointLike, C: PointLike, t: number) {
  out.x = quadraticBezier(A.x, B.x, C.x, t)
  out.y = quadraticBezier(A.y, B.y, C.y, t)
}

export function quadraticBezier3(out: Point3Like, A: Point3Like, B: Point3Like, C: Point3Like, t: number) {
  out.x = quadraticBezier(A.x, B.x, C.x, t)
  out.y = quadraticBezier(A.y, B.y, C.y, t)
  out.z = quadraticBezier(A.z, B.z, C.z, t)
}

export function cubicBezier(a: number, b: number, c: number, d: number, t: number): number {
  return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
}

export function cubicBezier2(out: PointLike, A: PointLike, B: PointLike, C: PointLike, D: PointLike, t: number) {
  out.x = cubicBezier(A.x, B.x, C.x, D.x, t)
  out.y = cubicBezier(A.y, B.y, C.y, D.y, t)
}

export function cubicBezier3(out: Point3Like, A: Point3Like, B: Point3Like, C: Point3Like, D: Point3Like, t: number) {
  out.x = cubicBezier(A.x, B.x, C.x, D.x, t)
  out.y = cubicBezier(A.y, B.y, C.y, D.y, t)
  out.z = cubicBezier(A.z, B.z, C.z, D.z, t)
}

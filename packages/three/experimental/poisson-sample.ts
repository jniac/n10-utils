// @ts-ignore
import { Vector2 } from 'three'

type PoissonDiscSampler2DOptions = Partial<{
  firstPoint: Vector2
  radius: number
  radiusDeltaRatio: number
  maxIteration: number
  maxPoints: number
  gridSizeMax: number
  securityCountMax: number
  randomDelegate: () => number
  pointIsOk: (point: Vector2) => boolean
}>

export function* poissonDiscSampler2D({
  firstPoint = new Vector2(),
  radius = 0.5,
  radiusDeltaRatio = 0.5,
  maxIteration = 12,
  maxPoints = 10000,
  gridSizeMax = 1000000,
  securityCountMax = 1000000,
  randomDelegate = () => Math.random(),
  pointIsOk = ({ x, y }: Vector2) => Math.abs(x) < 10 && Math.abs(y) < 10,
}: PoissonDiscSampler2DOptions = {}): Generator<Vector2> {
  const sqrRadius = radius * radius
  const cellSize = radius / Math.sqrt(2)
  const grid = new Map<number, Vector2>()
  const openPoints = [firstPoint]

  function pointToIndex({ x, y }: Vector2, dx = 0, dy = 0): number {
    return Math.floor(x / cellSize + dx + gridSizeMax / 2) * gridSizeMax + Math.floor(y / cellSize + dy + gridSizeMax / 2)
  }

  function gridContains(p: Vector2, dx = 0, dy = 0): boolean {
    return grid.has(pointToIndex(p, dx, dy))
  }

  function gridContainsClose(p: Vector2, dx = 0, dy = 0): boolean {
    const point = grid.get(pointToIndex(p, dx, dy))
    if (point) {
      return point.distanceToSquared(p) < sqrRadius
    }
    return false
  }

  grid.set(pointToIndex(firstPoint), firstPoint)

  let pointCount = 1

  yield firstPoint

  let security = 0
  while (pointCount < maxPoints && openPoints.length > 0 && security++ < securityCountMax) {
    const currentPoint = openPoints.splice(Math.floor(randomDelegate() * openPoints.length), 1)[0]

    let found = false
    for (let i = 0; i < maxIteration; i++) {
      const a = 2 * Math.PI * randomDelegate()
      const r = radius * (1 + radiusDeltaRatio * randomDelegate())
      const x = currentPoint.x + r * Math.cos(a)
      const y = currentPoint.y + r * Math.sin(a)
      const p = new Vector2(x, y)

      if (
        // Skip if...
        pointIsOk(p) === false || // point is not ok
        gridContains(p, 0, 0) || // a point is already there
        gridContainsClose(p, -1, -1) || // or a neighbor is too close
        gridContainsClose(p, +0, -1) || // idem.
        gridContainsClose(p, +1, -1) ||
        gridContainsClose(p, +1, +0) ||
        gridContainsClose(p, +1, +1) ||
        gridContainsClose(p, +0, +1) ||
        gridContainsClose(p, -1, +1) ||
        gridContainsClose(p, -1, +0)) {
        continue
      }

      openPoints.push(p)
      grid.set(pointToIndex(p), p)
      pointCount++
      found = true

      yield p

      break
    }

    if (found) {
      openPoints.push(currentPoint)
    }
  }
}

// @ts-ignore
import { Vector2 } from 'three'

const defaultParams = {
  /**
   * The first point to start the sampling.
   * 
   * Defaults to (0, 0).
   */
  firstPoint: new Vector2(),
  /**
   * The radius of the circle around each point where no other point can be generated.
   * 
   * Defaults to `0.5`.
   */
  radius: 0.5,
  /**
   * The "delta" ratio of the radius to generate the next point. 
   * 
   * The next point will be generated in a circle of `radius * (1 + radiusDeltaRatio * random)`.
   * 
   * Example:
   * ```
   * radius = 0.5, radiusDeltaRatio = 0.5 // random radius between 0.5 and 0.75
   * radius = 0.5, radiusDeltaRatio = 1.0 // random radius between 0.5 and 1.0
   * ```
   * 
   * Defaults to `0.5`.
   */
  radiusDeltaRatio: 0.5,
  /**
   * The maximum number of iterations to try to generate a point.
   * 
   * Defaults to `12`.
   * 
   * Could be decreased for better performance.
   */
  maxIteration: 12,
  maxPoints: 10_000,
  gridSizeMax: 1_000_000,
  securityCountMax: 1_000_000,
  /**
   * The random delegate to use.
   * 
   * Defaults to `Math.random`.
   */
  randomDelegate: () => Math.random(),
  /**
   * The function to check if a point is ok.
   * 
   * Defaults to: 
   * ```
   * ({ x, y }) => Math.abs(x) < 10 && Math.abs(y) < 10
   * // Point is ok if it is in a square of 20x20.
   * ```
   * 
   */
  pointIsOk: ({ x, y }: Vector2) => Math.abs(x) < 10 && Math.abs(y) < 10,
}

type Params = Partial<typeof defaultParams>

export function* poissonDiscSampler2D(options: Params = {}): Generator<Vector2> {
  const {
    firstPoint,
    radius,
    radiusDeltaRatio,
    maxIteration,
    maxPoints,
    gridSizeMax,
    securityCountMax,
    randomDelegate,
    pointIsOk,
  } = { ...defaultParams, ...options }

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

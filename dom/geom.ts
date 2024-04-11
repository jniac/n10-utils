
type RectLike = { x: number, y: number, width: number, height: number }

export function computeArea(rect: RectLike) {
  return rect.width * rect.height
}

export function applyUnion<T extends RectLike>(out: T, ...rects: RectLike[]): T {
  let rect = rects[0]
  let xMin = rect.x
  let yMin = rect.y
  let xMax = rect.x + rect.width
  let yMax = rect.y + rect.height
  for (let i = 1; i < rects.length; i++) {
    rect = rects[i]
    xMin = Math.min(xMin, rect.x)
    yMin = Math.min(yMin, rect.y)
    xMax = Math.max(xMax, rect.x + rect.width)
    yMax = Math.max(yMax, rect.y + rect.height)
  }

  out.x = xMin
  out.y = yMin
  out.width = xMax - xMin
  out.height = yMax - yMin

  return out
}

export function computeUnion(...rects: RectLike[]): DOMRect {
  return applyUnion(new DOMRect(), ...rects)
}

export function applyIntersection<T extends RectLike>(out: T, ...rects: RectLike[]): T {
  let rect = rects[0]
  let xMin = rect.x
  let yMin = rect.y
  let xMax = rect.x + rect.width
  let yMax = rect.y + rect.height
  for (let i = 1; i < rects.length; i++) {
    rect = rects[i]
    xMin = Math.max(xMin, rect.x)
    yMin = Math.max(yMin, rect.y)
    xMax = Math.min(xMax, rect.x + rect.width)
    yMax = Math.min(yMax, rect.y + rect.height)
  }
  if (xMin > xMax) {
    // No intersection, collapse to a point.
    xMin = xMax = (xMin + xMax) / 2
  }
  if (yMin > yMax) {
    // No intersection, collapse to a point.
    yMin = yMax = (yMin + yMax) / 2
  }

  out.x = xMin
  out.y = yMin
  out.width = xMax - xMin
  out.height = yMax - yMin

  return out
}

export function computeIntersection(...rects: RectLike[]): DOMRect {
  return applyIntersection(new DOMRect(), ...rects)
}
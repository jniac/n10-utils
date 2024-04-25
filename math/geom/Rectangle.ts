import { RectangleLike } from '../../types'
import { Padding, PaddingParams } from './Padding'

export function innerRectangle<T extends RectangleLike>(
  outerRect: RectangleLike,
  innerAspect: number,
  sizeMode: "contain" | "cover",
  alignX: number,
  alignY: number,
  out: T,
): T {
  let innerWidth = 0
  let innerHeight = 0

  // Determine dimensions based on the chosen sizing strategy
  if (sizeMode === "contain") {
    if (outerRect.width / outerRect.height > innerAspect) {
      // Outer is wider relative to desired aspect
      innerHeight = outerRect.height
      innerWidth = innerHeight * innerAspect
    } else {
      innerWidth = outerRect.width
      innerHeight = innerWidth / innerAspect
    }
  } else if (sizeMode === "cover") {
    if (outerRect.width / outerRect.height < innerAspect) {
      // Outer is narrower relative to desired aspect
      innerHeight = outerRect.height
      innerWidth = innerHeight * innerAspect
    } else {
      innerWidth = outerRect.width
      innerHeight = innerWidth / innerAspect
    }
  }

  // Calculate centering position
  const innerX = outerRect.x + (outerRect.width - innerWidth) * alignX
  const innerY = outerRect.y + (outerRect.height - innerHeight) * alignY

  out.x = innerX
  out.y = innerY
  out.width = innerWidth
  out.height = innerHeight

  return out
}

/**
 * Useful Rectangle class, for easier calculations.
 */
export class Rectangle implements RectangleLike {
  x: number = 0
  y: number = 0
  width: number = 0
  height: number = 0

  constructor()
  constructor(x: number, y: number, width: number, height: number)
  constructor(...args: any) {
    if (args.length > 0) {
      this.set.apply(this, args)
    }
  }

  *[Symbol.iterator](): Generator<number> {
    yield this.x
    yield this.y
    yield this.width
    yield this.height
  }

  copy(other: Rectangle): this {
    this.x = other.x
    this.y = other.y
    this.width = other.width
    this.height = other.height
    return this
  }

  clone(): Rectangle {
    return new Rectangle().copy(this)
  }

  set(x: number, y: number, width: number, height: number): this
  set(other: Rectangle): this
  set(...args: any): this {
    if (args.length === 4) {
      this.x = args[0]
      this.y = args[1]
      this.width = args[2]
      this.height = args[3]
      return this
    }
    if (args.length === 1) {
      const [arg] = args
      if (arg instanceof Rectangle) {
        this.copy(arg)
      }
    }
    if (args.length === 0) {
      this.x = 0
      this.y = 0
      this.width = 0
      this.height = 0
      return this
    }
    throw new Error('Oops. Wrong parameters here.')
  }

  getCenterX() {
    return this.x + this.width / 2
  }

  setCenterX(value: number): this {
    this.x = value - this.width / 2
    return this
  }

  getCenterY() {
    return this.y + this.height / 2
  }

  setCenterY(value: number): this {
    this.y = value - this.height / 2
    return this
  }

  getLeft() {
    return this.x
  }

  setLeft(value: number): this {
    if (value > this.left) {
      this.width = 0
      this.x = value
    } else {
      this.width += this.x - value
      this.x = value
    }
    return this
  }

  getRight() {
    return this.x + this.width
  }

  setRight(value: number): this {
    if (value < this.x) {
      this.width = 0
      this.x = value
    } else {
      this.width = value - this.x
    }
    return this
  }

  getTop() {
    return this.y
  }

  setTop(value: number): this {
    if (value > this.y + this.height) {
      this.height = 0
      this.y = value
    } else {
      this.height += this.y - value
      this.y = value
    }
    return this
  }

  getBottom() {
    return this.y + this.height
  }

  setBottom(value: number): this {
    if (value < this.y) {
      this.height = 0
      this.y = value
    } else {
      this.height = value - this.y
    }
    return this
  }

  multiplyScalar(scalarX: number, scalarY: number): this {
    this.x *= scalarX
    this.y *= scalarY
    this.width *= scalarX
    this.height *= scalarY
    return this
  }

  applyPadding(padding: PaddingParams): this {
    const pad = Padding.ensure(padding)
    this.x += pad.left
    this.y += pad.top
    this.width -= pad.left + pad.right
    this.height -= pad.top + pad.bottom
    return this
  }

  innerRectangle({
    aspect = 1,
    sizeMode = 'contain',
    alignX = .5,
    alignY = .5,
    padding = 0,
  }: Partial<{
    aspect: number
    sizeMode: "contain" | "cover"
    alignX: number
    alignY: number
    padding: PaddingParams
  }>,
    out: Rectangle = new Rectangle(),
  ) {
    return innerRectangle(
      _rect.copy(this).applyPadding(padding),
      aspect, sizeMode, alignX, alignY, out)
  }

  containsXY(x: number, y: number): boolean {
    return x >= this.x
      && x < this.x + this.width
      && y >= this.y
      && y < this.y + this.height
  }

  containsRect(other: RectangleLike): boolean {
    return other.x >= this.x
      && other.y >= this.y
      && other.x + other.width <= this.x + this.width
      && other.y + other.height <= this.y + this.height
  }

  // Sugar:
  get centerX() {
    return this.getCenterX()
  }
  set centerX(value: number) {
    this.setCenterX(value)
  }

  get centerY() {
    return this.getCenterY()
  }
  set centerY(value: number) {
    this.setCenterY(value)
  }

  get left() {
    return this.getLeft()
  }
  set left(value: number) {
    this.setLeft(value)
  }

  get right() {
    return this.getRight()
  }
  set right(value: number) {
    this.setRight(value)
  }

  get top() {
    return this.getTop()
  }
  set top(value: number) {
    this.setTop(value)
  }

  get bottom() {
    return this.getBottom()
  }
  set bottom(value: number) {
    this.setBottom(value)
  }
}

const _rect = new Rectangle()


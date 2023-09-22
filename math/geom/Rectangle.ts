/**
 * Useful Rectangle class, for easier calculations.
 */
export class Rectangle {
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
  *[Symbol.iterator](): Generator<number, void, unknown> {
    yield this.x
    yield this.y
    yield this.width
    yield this.height
  }
  // Sugar:
  get centerX() {
    return this.x + this.width / 2
  }
  set centerX(value: number) {
    this.x = value - this.width / 2
  }
  get centerY() {
    return this.y + this.height / 2
  }
  set centerY(value: number) {
    this.y = value - this.height / 2
  }
}

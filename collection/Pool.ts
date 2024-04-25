/**
 * A pool of objects that can be reused. Dead simple.
 */
export class Pool<T> {
  private free: T[] = [];
  private used: T[] = [];

  get size() {
    return this.free.length + this.used.length
  }

  constructor(private create: () => T) { }

  require() {
    if (this.free.length === 0) {
      this.free.push(this.create())
    }
    const item = this.free.pop()!
    this.used.push(item)
    console.log(`count: ${this.free.length + this.used.length}`)
    return item
  }

  release(item: T) {
    const index = this.used.indexOf(item)
    if (index !== -1) {
      this.used.splice(index, 1)
      this.free.push(item)
    }
  }
}

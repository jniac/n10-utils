/**
 * A pool of objects that can be reused. Dead simple.
 */
export class Pool<T> {
  private _free: T[] = [];
  private _used: T[] = [];

  get usedCount() {
    return this._used.length
  }

  get totalCount() {
    return this._free.length + this._used.length
  }

  constructor(
    private create: () => T,
  ) { }

  *usedItems(): Generator<T> {
    for (const item of this._used) {
      yield item
    }
  }

  require() {
    if (this._free.length === 0) {
      this._free.push(this.create())
    }
    const item = this._free.pop()!
    this._used.push(item)
    return item
  }

  release(item: T) {
    const index = this._used.indexOf(item)
    if (index !== -1) {
      this._used.splice(index, 1)
      this._free.push(item)
    }
  }
}

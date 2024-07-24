import { Observable, SetValueOptions } from './observable'

/**
 * ObservableSet is a set that can be observed for changes. Among other things,
 * it can be used to track entering and leaving items.
 */
export class ObservableSet<T> extends Observable<Iterable<T>> {
  private _entering = new Set<T>()
  private _leaving = new Set<T>()

  private get _set(): Set<T> { return this._value as Set<T> }
  private get _setOld(): Set<T> { return this._valueOld as Set<T> }

  get entering() { return new Set(this._entering) }
  get leaving() { return new Set(this._leaving) }

  get size() { return this._set.size }

  constructor() {
    super(new Set())
    this._valueOld = new Set()
  }

  private swap() {
    const { _set, _setOld } = this
    this._value = _setOld
    this._valueOld = _set
  }

  override get value(): Set<T> {
    return new Set(this._value)
  }

  override get valueOld(): Set<T> {
    return new Set(this._valueOld)
  }

  has(value: T): boolean {
    return (this._value as Set<T>).has(value)
  }

  override setValue(incomingValues: Iterable<T>, options?: SetValueOptions | undefined): boolean {
    // Delay special case:
    if (this._handleDelay(incomingValues, options)) {
      return false
    }

    this.swap()

    const { _set, _setOld, _entering, _leaving } = this

    _entering.clear()
    _leaving.clear()
    _set.clear()

    for (const value of incomingValues) {
      if (!_setOld.has(value)) {
        _entering.add(value)
      }
      _set.add(value)
    }

    for (const value of _setOld) {
      if (!_set.has(value)) {
        _leaving.add(value)
      }
    }

    const hasChanged = _entering.size > 0 || _leaving.size > 0

    if (hasChanged) {
      this._invokeListeners()
    }

    return hasChanged
  }

  /**
   * TODO: Implement this in its own instead of relying on setValue.
   * @param values
   */
  add(...values: T[]): boolean {
    return this.setValue([...this.value, ...values])
  }

  /**
   * TODO: Implement this in its own instead of relying on setValue.
   * @param values
   */
  remove(...values: T[]): boolean {
    return this.setValue([...this.value].filter(value => !values.includes(value)))
  }

  clear(): boolean {
    return this.setValue([])
  }

  /**
   * Returns the intersection between another set and this set.
   */
  intersection(other: Iterable<T>): Set<T> {
    const result = new Set<T>()

    for (const value of other) {
      if (this.has(value)) {
        result.add(value)
      }
    }

    return result
  }

  /**
   * Returns the difference between another set and this set.
   */
  otherDifference(other: Iterable<T>): Set<T> {
    const result = new Set<T>()

    for (const value of other) {
      if (!this.has(value)) {
        result.add(value)
      }
    }

    return result
  }
}

/**
 * Behavior:
 * ```
 * value: [], entering: [], leaving: [], valueOld: []
 * ----------------
 * add(A, B)
 * ----------------
 * value: [A, B], entering: [A, B], leaving: [], valueOld: []
 * ----------------
 * add(B, C)
 * ----------------
 * value: [A, B, C], entering: [C], leaving: [], valueOld: [A, B]
 * ----------------
 * set([])
 * ```
 */
// Object.assign(ObservableSet, {
//   test() {
//     const set = new ObservableSet<string>()

//     function log() {
//       console.log(`value: [${[...set.value].join(', ')}], entering: [${[...set.entering].join(', ')}], leaving: [${[...set.leaving].join(', ')}], valueOld: [${[...set.valueOld].join(', ')}]`)
//     }

//     log()
//     set.setValue(['A', 'B'])
//     log()
//     set.setValue(['A', 'B', 'C'])
//     log()
//     set.setValue(['C'])
//     log()
//     set.remove('C')
//     log()
//   }
// })


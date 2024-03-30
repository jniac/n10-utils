import { Observable } from './observable'

/**
 * An observable that can switch between a set of values.
 * 
 * NOTE: still WIP
 */
class ObservableSwitch<T extends V[] = any[], V = T[number]> extends Observable<V> {
  private _options: T

  get options() {
    return this._options
  }

  constructor(options: T, initialValue: V = options[0]) {
    super(initialValue)
    this._options = options
  }
}

export { ObservableSwitch }

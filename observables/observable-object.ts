import { deepClone, deepCopy, deepDiff } from '../object/deep'
import { DeepPartial } from '../types'
import { Delay } from './delay'
import { Observable, SetValueOptions } from './observable'

/**
 * An observable object.
 *
 * NOTE:
 * - The object is cloned deeply when setting a new value.
 */
export class ObservableObject<T extends {}> extends Observable<T> {
  get value() {
    // Return a deep clone of the value, for immutability:
    return deepClone(this._value)
  }

  override setValue(value: T, options?: SetValueOptions): boolean {
    return this.updateValue(value as any, options)
  }

  updateValue(incomingValue: DeepPartial<T>, options?: SetValueOptions): boolean {
    const clonedValue = deepClone(this._value)
    const allowNewKeys = false
    const isDifferent = deepCopy(incomingValue, clonedValue, allowNewKeys)
    if (isDifferent) {
      return super.setValue(clonedValue, options)
    }
    return false
  }

  override valueToString(): string {
    if (this.valueStringifier) {
      return this.valueStringifier(this._value)
    }
    return JSON.stringify(this._value)
  }

  override setValueFromString(value: string, options?: Partial<{ delay: Delay }> | undefined): boolean {
    try {
      if (this.valueParser) {
        const parsedValue = this.valueParser(value)
        return this.setValue(parsedValue, options)
      }
      const parsedValue = JSON.parse(value)
      return this.updateValue(parsedValue as any, options)
    } catch (error) {
      return false
    }
  }

  getDiff() {
    const { a, b } = deepDiff(this._value, this._valueOld)
    return { new: a, old: b }
  }
}

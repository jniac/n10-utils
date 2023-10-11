import { DestroyableObject } from '../types'
import { Memorization } from './memorization'
import { Observable, ConstructorOptions, Callback, SetValueOptions } from './observable'

const passModeValues = ['above', 'below', 'through'] as const
type PassMode = (typeof passModeValues)[number]

export class ObservableNumber extends Observable<number> {
  private _memorization: Memorization | null = null;

  constructor(initialValue: number, options?: [min: number, max: number] | ConstructorOptions<number>) {
    if (Array.isArray(options)) {
      const [min, max] = options
      options = {
        valueMapper: (value: number) => value < min ? min : value > max ? max : value
      } as ConstructorOptions<number>
    }
    super(initialValue, options)
  }

  initMemorization(memorizationLength: number, derivativeCount: number = 0): this {
    this._memorization = new Memorization(memorizationLength, this._value, derivativeCount)
    return this
  }

  getMemorization(): Memorization {
    return this._memorization!
  }

  isAbove(threshold: number): boolean {
    return this._value >= threshold
  }

  isBelow(threshold: number): boolean {
    return this._value < threshold
  }

  passed(mode: PassMode, threshold: number): boolean {
    const { value, valueOld} = this
    const isAbove = value >= threshold && valueOld < threshold
    const isBelow = value < threshold && valueOld >= threshold
    switch(mode) {
      case 'through': return isAbove || isBelow
      case 'above': return isAbove
      case 'below': return isBelow
    }
    throw new Error('Impossible! Typescript, where are you?')
  }

  getPassMode(threshold: number): (typeof passModeValues)[0] | (typeof passModeValues)[1] | null {
    const { value, valueOld} = this
    const isAbove = value >= threshold && valueOld < threshold
    const isBelow = value < threshold && valueOld >= threshold
    if (isAbove) {
      return 'above'
    }
    if (isBelow) {
      return 'below'
    }
    return null
  }

  /**
   * Same as `onChange` but with a callback that will be called less often since
   * a step is applied to the value first.
   */
  onStepChange(step: number, callback: Callback<number>): DestroyableObject {
    let stepValue = Math.round(this.value / step) * step
    return this.onChange(() => {
      let newStepValue = Math.round(this.value / step) * step
      if (stepValue !== newStepValue) {
        stepValue = newStepValue
        callback(stepValue, this)
      }
    })
  }

  onPass(mode: PassMode, threshold: number, callback: Callback<number>): DestroyableObject {
    return this.onChange(() => {
      if (this.passed(mode, threshold)) {
        callback(this.value, this)
      }
    })
  }

  setValue(incomingValue: number, options?: SetValueOptions): boolean {
    // Delay special case:
    if (this._handleDelay(incomingValue, options)) {
      return false
    }

    // No-delay, regular case:
    const hasChanged = super.setValue(incomingValue, options)
    if (this._memorization) {
      // NOTE: `hasChanged` is ignored with memorization (which may record "zero" changes).
      this._memorization.setValue(this._valueMapper?.(incomingValue, this) ?? incomingValue, true)
    }
    return hasChanged
  }

  increment(delta: number): boolean {
    return this.setValue(this._value + delta)
  }

  lerpTo(target: number, alpha: number, {
    clamp = true,
    epsilon = 1e-9,
  } = {}): boolean {
    const value = this._value
    const newValue = Math.abs(target - value) < epsilon
      ? target
      : value + (target - value) * (clamp ? alpha < 0 ? 0 : alpha > 1 ? 1 : alpha : alpha)
    return this.setValue(newValue)
  }

  lerp(a: number, b: number, options?: Partial<{ clamped: boolean }>): number {
    let alpha = this._value
    if (options?.clamped === true) {
      alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha
    }
    return a + (b - a) * alpha
  }

  inverseLerp(a: number, b: number, options?: Partial<{ clamped: boolean }>): number {
    let alpha = (this._value - a) / (b - a)
    if (options?.clamped === true) {
      alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha
    }
    return alpha
  }
}

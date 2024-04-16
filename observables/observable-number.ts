import { DestroyableObject } from '../types'
import { Memorization } from './memorization'
import { Callback, ConstructorOptions, Observable, OnChangeOptions, SetValueOptions } from './observable'

const passModeValues = ['above', 'below', 'through'] as const
type PassMode = (typeof passModeValues)[number]

type ConstructorNumberOptions = ConstructorOptions<number> & Partial<{
  min: number
  max: number
  integer: boolean
}>

function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x
}

export class ObservableNumber extends Observable<number> {
  private _memorization: Memorization | null = null
  private _min: number
  private _max: number
  private _integer: boolean

  get min(): number {
    return this._min
  }

  set min(value: number) {
    this.setMinMax(value, this._max)
  }

  get max(): number {
    return this._max
  }

  set max(value: number) {
    this.setMinMax(this._min, value)
  }

  constructor(initialValue: number, options?: [min: number, max: number] | ConstructorNumberOptions) {
    let min = -Infinity, max = Infinity

    if (Array.isArray(options)) {
      [min, max] = options
      options = {} as ConstructorOptions<number>
    } else {
      min = options?.min ?? min
      max = options?.max ?? max
    }

    super(clamp(initialValue, min, max), options)

    this._min = min
    this._max = max
    this._integer = options?.integer ?? false
  }

  override setValue(incomingValue: number, options?: SetValueOptions): boolean {
    // Before anything, clamp the incoming value:
    incomingValue = clamp(incomingValue, this._min, this._max)
    incomingValue = this._integer ? Math.round(incomingValue) : incomingValue

    // Delay special case:
    if (this._handleDelay(incomingValue, options)) {
      return false
    }

    // No-delay, regular case:
    const hasChanged = super.setValue(incomingValue, options)
    if (this._memorization) {
      // NOTE: `hasChanged` is ignored with memorization (which may record "zero" changes).
      this._memorization.setValue(this._value, true)
    }
    return hasChanged
  }

  /**
   * Returns true if the value has changed (because of the new bounds).
   */
  setMinMax(min: number, max: number): boolean {
    const newValue = clamp(this._value, min, max)
    this._min = min
    this._max = max
    if (this._value !== newValue) {
      return this.setValue(newValue)
    }
    return false
  }

  /**
   * Memorization is a way to keep track of the value and its derivatives over time.
   * 
   * Usage:
   * ```
   * const obs = new ObservableNumber(0)
   * 
   * obs.initMemorization(10, { derivativeCount: 2 })
   * 
   * // constant accelaration
   * for (let i = 1; i <= 5; i++) {
   *     obs.value = i
   * }
   * 
   * // increasing acceleration
   * for (let i = 2; i <= 6; i++) {
   *     obs.value += i
   * }
   * 
   * // position:
   * console.log('pos', ...obs.getMemorization().values())
   * // pos 25 19 14 10 7 5 4 3 2 1
   * 
   * // velocity (1st derivative):
   * console.log('vel', ...obs.getMemorization().derivative!.values())
   * // vel 6 5 4 3 2 1 1 1 1 1
   * 
   * // acceleration (2nd derivative):
   * console.log('acc', ...obs.getMemorization().derivative!.derivative!.values())
   * // acc 1 1 1 1 1 0 0 0 0 1
   * ```
   */
  initMemorization(memorizationLength: number, { derivativeCount = 0 } = {}): this {
    if (typeof arguments[1] === 'number') {
      console.warn('ObservableNumber.initMemorization(memorizationLength, derivativeCount) is deprecated. Use ObservableNumber.initMemorization(memorizationLength, { derivativeCount }) instead.')
      derivativeCount = arguments[1]
    }

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
    const { value, valueOld } = this
    const isAbove = value >= threshold && valueOld < threshold
    const isBelow = value < threshold && valueOld >= threshold
    switch (mode) {
      case 'through': return isAbove || isBelow
      case 'above': return isAbove
      case 'below': return isBelow
    }
    throw new Error('Impossible! Typescript, where are you?')
  }

  getPassMode(threshold: number): (typeof passModeValues)[0] | (typeof passModeValues)[1] | null {
    const { value, valueOld } = this
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

  stepValue(step: number): number {
    return Math.round(this._value / step) * step
  }

  /**
   * Same as `onChange` but with a callback that will be called less often since
   * a step is applied to the value.
   */
  onStepChange(step: number, callback: Callback<number>): DestroyableObject
  onStepChange(step: number, options: OnChangeOptions, callback: Callback<number>): DestroyableObject
  onStepChange(...args: any[]): DestroyableObject {
    function solveArgs(args: any[]): [number, OnChangeOptions, Callback<number>] {
      if (args.length === 3) {
        return args as [number, OnChangeOptions, Callback<number>]
      }
      if (args.length === 2) {
        return [args[0], {}, args[1]]
      }
      throw new Error(`Invalid arguments: (${args.join(', ')})`)
    }
    const [step, options, callback] = solveArgs(args)
    let stepValue = NaN
    return this.onChange(options, () => {
      let newStepValue = this.stepValue(step)
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

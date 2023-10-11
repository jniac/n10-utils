import { DestroyableObject } from '../types'
import { ConstructorOptions, Observable } from './observable'

type Source = Record<string, Observable<any>>
type Values<S extends Source> = { [Property in keyof S]: S[Property]['value'] }
type Callback<S extends Source, T> = (values: Values<S>) => T
type UpdateMode = 'immediate' | 'never' | `${number}frames` | `${number}ms` | `${number}s`

const defaultOptions = {
  /** 
   * `"immediate"` means "immediate" execution, `"never"` means that the solver 
   * will never update (you have to call update() yourself), other values will 
   * delay the update at least until the next frame, which can help save significant
   * calculations if the observable sources are likely to change very often.
   * 
   * Defaults to `"immediate"`.
   */
  update: <UpdateMode>'immediate',

  /**
   * When using a delayed Solver with a "frame" delay, a custom pair of 
   * requestAnimationFrame / cancelAnimationFrame may be provided.
   * 
   * Defaults to `[window.requestAnimationFrame, window.cancelAnimationFrame]`
   */
  animationFrame: <null | [
    requestAnimationFrame: typeof window.requestAnimationFrame,
    cancelAnimationFrame: typeof window.cancelAnimationFrame,
  ]>null,

  /**
   * When using a delayed Solver with a "time" delay ("s" or "ms"), a custom pair 
   * of setInterval / clearInterval may be provided.
   * 
   * Defaults to `[globalThis.setInterval, globalThis.clearInterval]`
   */
  interval: <null | [
    setInterval: typeof globalThis.setInterval,
    clearInterval: typeof globalThis.clearInterval,
  ]>null,
}

type Options<T> = Partial<typeof defaultOptions> & ConstructorOptions<T>

/**
 * Solver is for "solving" multiple observables into one. Solver takes a bundle of
 * observables and a "solve" function, subscribe to any changes and update its own
 * value according to the returned value of "solve" function.
 * 
 * An important feature of solvers is their ability to defer updating their internal 
 * value. This helps reduce unwanted/unnecessary updates.
 * 
 * The delay, if specified (`null` by default), can be of two types: 
 * - 'frame' (client side, depends on client frame rate and requires 
 * requestAnimationFrame/cancelAnimationFrame) 
 * - 'time' (seconds or milliseconds, requires setInterval/clearInterval).
 * 
 * Usage:
 * ```
 * const observables = {
 *   bar: new Observable(false),
 *   foo: new Observable(3),
 * }
 * const solver = new Solver(observables, ({ bar, foo }) => {
 *   return bar && foo > .5
 * }, {
 *   delay: '0.5s',
 *   onChange: value => console.log(`new value is: ${value}`)
 * })
 * observables.bar.setValue(true)
 * // "new value is: true" (after 0.5 seconds)
 * ```
 */
class Solver<T, S extends Source> extends Observable<T> implements DestroyableObject {
  readonly observables: Readonly<S>

  update: () => void
  destroy: () => void

  constructor(sources: S, solve: Callback<S, T>, options: Options<T>) {
    const values = Object.fromEntries(Object.entries(sources).map(([key, obs]) => [key, obs.value])) as Values<S>
    const {
      update: updateArg,
      animationFrame,
      interval,
      ...superOptions
    } = { ...defaultOptions, ...options }

    super(solve(values), superOptions)

    this.observables = sources

    const onDestroy = new Set<() => void>()
    this.destroy = () => {
      for (const destroy of onDestroy) {
        destroy()
      }
    }

    this.update = () => {
      this.setValue(solve(values))
    }

    if (updateArg === 'immediate') {
      // Immediate update:
      initImmediate(sources, values, this.update, onDestroy)
    } else if (updateArg.endsWith('frames')) {
      // Delayed update based on animation frame (client side only):
      initAnimationFrame(sources, values, this.update, onDestroy, updateArg, animationFrame)
    } else if (updateArg.endsWith('ms') || updateArg.endsWith('s')) {
      // Delayed update based on setInterval (do not rely on 'window'):
      initInterval(sources, values, this.update, onDestroy, updateArg, interval)
    } else {
      // no delay...
    }
  }
}

function initImmediate<S extends Source>(
  sources: S,
  values: Values<S>,
  update: () => void,
  onDestroy: Set<() => void>,
): void {
  for (const [key, observable] of Object.entries(sources)) {
    const { destroy } = observable.onChange(value => {
      (values as any)[key] = value
      update()
    })
    onDestroy.add(destroy)
  }
}

function initAnimationFrame<S extends Source>(
  sources: S,
  values: Values<S>,
  update: () => void,
  onDestroy: Set<() => void>,
  updateArg: string,
  animationFrame: Options<any>['animationFrame'],
): void {
  if (typeof window === 'undefined') {
    throw new Error(`For now, delayed Solver cannot run on Node (requiring requestAnimationFrame/cancelAnimationFrame)`)
  }
  // NOTE: if heavy usage of this, the window animation frame could be centralized
  // in one place.
  const [request, cancel] = animationFrame ?? [window.requestAnimationFrame, window.cancelAnimationFrame]
  let frameId = -1
  let dirty = -1
  onDestroy.add(() => {
    cancel(frameId)
  })
  const onFrame = () => {
    frameId = request(onFrame)
    if (dirty === 0) {
      dirty = -1
      update()
    } else if (dirty > 0) {
      dirty--
    }
  }
  frameId = request(onFrame)
  const frames = Number.parseFloat(updateArg.slice(0, -6))
  for (const [key, observable] of Object.entries(sources)) {
    const { destroy } = observable.onChange(value => {
      (values as any)[key] = value
      if (dirty === -1) {
        dirty = frames
      }
    })
    onDestroy.add(destroy)
  }
}

function initInterval<S extends Source>(
  sources: S,
  values: Values<S>,
  update: () => void,
  onDestroy: Set<() => void>,
  updateArg: string,
  interval: Options<any>['interval'],
): void {
  const [setInterval, clearInterval] = interval ?? [globalThis.setInterval, globalThis.clearInterval]
  const DELTA_TIME = 1 / 60
  let time = -Infinity
  const id = setInterval(() => {
    if (time > -Infinity) {
      if (time <= 0) {
        update()
        time = -Infinity
      } else {
        time += -DELTA_TIME
      }
    }
  }, 1000 * DELTA_TIME)
  onDestroy.add(() => {
    clearInterval(id)
  })
  const duration = updateArg.endsWith('s')
    ? Number.parseFloat(updateArg.slice(0, -1)) // "s"
    : Number.parseFloat(updateArg.slice(0, -2)) / 1000 // "ms"
  for (const [key, observable] of Object.entries(sources)) {
    const { destroy } = observable.onChange(value => {
      (values as any)[key] = value
      if (time === -Infinity) {
        time = duration
      }
    })
    onDestroy.add(destroy)
  }
}

export { Solver }

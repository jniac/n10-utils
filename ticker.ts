import { inverseLerp } from './math/basics'
import { easeInOut2 } from './math/easing'
import { DestroyableObject } from './types'

function onUserInteraction(callback: () => void): DestroyableObject
function onUserInteraction(element: HTMLElement | Window, callback: () => void): DestroyableObject
function onUserInteraction(...args: any[]): DestroyableObject {
  const [element, callback] = args.length === 1 ? [window, args[0]] : args
  const onInteraction = () => {
    callback()
  }
  element.addEventListener('mousemove', onInteraction)
  element.addEventListener('mousedown', onInteraction)
  element.addEventListener('mouseup', onInteraction)
  element.addEventListener('touchstart', onInteraction)
  element.addEventListener('touchmove', onInteraction)
  element.addEventListener('wheel', onInteraction)
  element.addEventListener('keydown', onInteraction)
  element.addEventListener('keyup', onInteraction)
  const destroy = () => {
    element.removeEventListener('mousemove', onInteraction)
    element.removeEventListener('mousedown', onInteraction)
    element.removeEventListener('mouseup', onInteraction)
    element.removeEventListener('touchstart', onInteraction)
    element.removeEventListener('touchmove', onInteraction)
    element.removeEventListener('wheel', onInteraction)
    element.removeEventListener('keydown', onInteraction)
    element.removeEventListener('keyup', onInteraction)
  }
  return { destroy }
}

class Tick {
  static defaultActiveDuration = 10
  static defaultActiveFadeDuration = 1
  static previousCountMax = 10

  constructor(
    public previousTick: Tick | null = null,
    public readonly frame: number = 0,
    public readonly timeScale: number = 1,
    public readonly time: number = 0,
    public readonly deltaTime: number = 0,
    public readonly unscaledDeltaTime: number = 0,
    public readonly windowDeltaTime: number = 0,
    public readonly maxDeltaTime: number = 0,
    public readonly paused: boolean = false,

    // Active properties:
    public readonly activeLastRequest: number = 0,
    /**
     * Duration of the "update" phase (in seconds). During this interval, the clock
     * will update constantly.
     */
    public readonly activeDuration: number = Tick.defaultActiveDuration,
    /**
     * Duration of the "fade" phase (in seconds). During this interval, the clock
     * will progressively slow down to zero.
     */
    public readonly activeFadeDuration: number = Tick.defaultActiveFadeDuration,
    /**
     * Last time the clock was requested to update (in "window" time which may differ from the current clock time).
     */
    public readonly activeTimeScale: number = 1,
  ) {
    let current = previousTick
    let count = 0
    while (current !== null) {
      if (++count >= Tick.previousCountMax) {
        current.previousTick = null
        break
      }
      current = current.previousTick
    }
  }

  // Old shorthands:
  get previousTime() { return this.previousTick?.time ?? this.time }
  get previousDeltaTime() { return this.previousTick?.deltaTime ?? this.deltaTime }
  get previousUnscaledDeltaTime() { return this.previousTick?.unscaledDeltaTime ?? this.unscaledDeltaTime }

  get remainingActiveDuration() { return this.activeLastRequest + this.activeDuration - windowTime }

  // Backward compatibility:
  /**
   * @deprecated Use {@link Tick.previousTime} instead.
   */
  get timeOld() { return this.previousTime }
  /**
   * @deprecated Use {@link Tick.previousDeltaTime} instead.
   */
  get deltaTimeOld() { return this.previousDeltaTime }
  /**
   * @deprecated Use {@link Tick.activeDuration} instead.
   */
  get updateDuration() { return this.activeDuration }
  /**
   * @deprecated Use {@link Tick.activeFadeDuration} instead.
   */
  get updateFadeDuration() { return this.activeFadeDuration }
  /**
   * @deprecated Use {@link Tick.activeTimeScale} instead.
   */
  get updateFadeTimeScale() { return this.activeTimeScale }

  toString() {
    return `Tick { frame: ${this.frame}, time: ${this.time.toFixed(3)}, deltaTime: ${this.deltaTime.toFixed(3)} }`
  }
}

type TickCallback = (tick: Tick) => void | 'stop'

let listenerNextId = 0
type Listener = Readonly<{
  id: number
  callback: TickCallback
  order: number
}>

class Listeners {
  private _sortDirty = true
  private _countDirty = true
  private readonly _listeners: Listener[] = []
  private _loopListeners: Listener[] = []

  add(order: number, callback: TickCallback): Listener {
    // NOTE: Optimization: we don't need to sort the listeners if the new listener
    // can be appended at the end of the list.
    // NOTE: If the sortDirty flag is already set, it means that the listeners are
    // already not sorted, so we don't need to check the order.
    // So we have to use the "or assign" operator (||=) here.
    this._sortDirty ||= this._listeners.length > 0
      && order < this._listeners[this._listeners.length - 1].order

    this._countDirty = true

    const id = listenerNextId++
    const listener = { id, order, callback }
    this._listeners.push(listener)
    return listener
  }

  remove(callback: TickCallback): boolean {
    const index = this._listeners.findIndex(listener => listener.callback === callback)
    if (index !== - 1) {
      this._listeners.splice(index, 1)
      this._countDirty = true
      return true
    } else {
      return false
    }
  }

  removeById(id: number): boolean {
    const index = this._listeners.findIndex(listener => listener.id === id)
    if (index !== - 1) {
      this._listeners.splice(index, 1)
      this._countDirty = true
      return true
    } else {
      return false
    }
  }

  call(tick: Tick) {
    if (this._sortDirty) {
      this._listeners.sort((A, B) => A.order - B.order)
      this._sortDirty = false
    }
    if (this._countDirty) {
      this._loopListeners = [...this._listeners]
      this._countDirty = false
    }
    for (const { callback } of this._loopListeners) {
      const result = callback(tick)
      if (result === 'stop') {
        this.remove(callback)
      }
    }
  }

  clear() {
    this._listeners.length = 0
    this._countDirty = true
  }
}


let windowTime = 0
const animationFrameCallbacks = new Set<(windowDeltaTime: number) => void>()

if (typeof window !== 'undefined') {
  windowTime = window.performance.now() / 1e3
  const animationFrame = (ms: number) => {
    window.requestAnimationFrame(animationFrame)
    const windowTimeOld = windowTime
    windowTime = ms / 1e3
    const windowDeltaTime = windowTime - windowTimeOld
    for (const callback of animationFrameCallbacks) {
      callback(windowDeltaTime)
    }
  }
  window.requestAnimationFrame(animationFrame)
}

type OnTickOptions = Partial<{
  /**
   * Order of the callback. The lower the order, the earlier the callback will be
   * called.
   */
  order: number
  /**
   * `activeDuration` controls the duration of the "update" phase (in seconds).
   * 
   * The value is held by the ticker, if it's not provided here, the current value
   * will remain.
   */
  activeDuration: number
  /**
   * If `timeInterval` is greater than 0, the callback will be called approximately
   * every `timeInterval` seconds.
   */
  timeInterval: number
  /**
   * If `frameInterval` is greater than 0, the callback will be called every
   * `frameInterval` frames.
   */
  frameInterval: number
  /**
   * If `true`, the callback will be removed after the first call.
   */
  once: boolean
}>

class Ticker implements DestroyableObject, Tick {
  private _state = {
    frame: 0,
    timeScale: 1,
    maxDeltaTime: .1,
    freezed: false,

    activeDuration: Tick.defaultActiveDuration,
    activeFadeDuration: Tick.defaultActiveFadeDuration,
    activeLastRequest: 0,

    suspended: false,
    suspendForceNextFrame: false,
    requestAnimationFrame: 0,

    caughtErrors: false,
  }

  suspend() { this._state.suspended = true }
  resume() { this._state.suspended = false }
  /** When set to `true`, the ticker will render the next frame even if it's suspended. */
  nextFrame() { this._state.suspendForceNextFrame = true }

  /**
   * If `true`, the clock will catch errors thrown by the callbacks and stop the
   * loop if it happens.
   *
   * `true` by default.
   *
   * Could be set to false for performance reasons.
   */
  catchErrors = true

  // Destroyable implementation.
  destroy: () => void
  value() { return this }

  private _updateListeners = new Listeners()
  private _freezeListeners = new Listeners()
  private _unfreezeListeners = new Listeners()

  private _tick = new Tick()

  // Getters, Tick implementation.
  get previousTick() { return this._tick.previousTick }
  get frame() { return this._tick.frame }
  get timeScale() { return this._tick.timeScale }
  get time() { return this._tick.time }
  get previousTime() { return this._tick.previousTime }
  get deltaTime() { return this._tick.deltaTime }
  get previousDeltaTime() { return this._tick.previousDeltaTime }
  get unscaledDeltaTime() { return this._tick.unscaledDeltaTime }
  get previousUnscaledDeltaTime() { return this._tick.previousUnscaledDeltaTime }
  get windowDeltaTime() { return this._tick.windowDeltaTime }
  get maxDeltaTime() { return this._tick.maxDeltaTime }
  get paused() { return this._tick.paused }
  get activeLastRequest() { return this._tick.activeLastRequest }
  get activeDuration() { return this._tick.activeDuration }
  get activeFadeDuration() { return this._tick.activeFadeDuration }
  get activeTimeScale() { return this._tick.activeTimeScale }
  /**
   * @deprecated Use {@link Ticker.previousTime} instead.
   */
  get timeOld() { return this._tick.timeOld }
  /**
   * @deprecated Use {@link Ticker.previousDeltaTime} instead.
   */
  get deltaTimeOld() { return this._tick.deltaTimeOld }
  /**
   * @deprecated Use {@link Ticker.activeDuration} instead.
   */
  get updateDuration() { return this._tick.updateDuration }
  /**
   * @deprecated Use {@link Ticker.activeFadeDuration} instead.
   */
  get updateFadeDuration() { return this._tick.updateFadeDuration }
  /**
   * @deprecated Use {@link Ticker.activeTimeScale} instead.
   */
  get updateFadeTimeScale() { return this._tick.updateFadeTimeScale }

  get remainingActiveDuration() { return this.activeLastRequest + this._tick.activeDuration - windowTime }

  get freezed() { return this._state.freezed }
  get tick() { return this._tick }

  /**
   * @deprecated Use `tick` instead.
   */
  get state() { return this._tick }

  constructor({ activeDuration } = {} as { activeDuration?: number }) {
    if (activeDuration !== undefined) {
      this._state.activeDuration = activeDuration
    }

    const update = (windowDeltaTime: number) => {
      const {
        frame,
        timeScale,
        maxDeltaTime,
        activeDuration,
        activeFadeDuration,
        activeLastRequest,
        suspended,
        suspendForceNextFrame,
        caughtErrors,
        requestAnimationFrame,
      } = this._state

      if ((suspended && suspendForceNextFrame === false) || caughtErrors) {
        return
      }

      // Reset the flag.
      this._state.suspendForceNextFrame = false

      // Auto-pause handling:
      if (requestAnimationFrame >= 0) {
        this._state.requestAnimationFrame += -windowDeltaTime
        this._state.activeLastRequest = windowTime
      }

      const getActiveTimeScale = () => {
        const { activeDuration, activeLastRequest } = this
        if (Number.isFinite(activeDuration)) {
          const updateTime1 = activeLastRequest + activeDuration
          const updateTime2 = updateTime1 + activeFadeDuration
          return easeInOut2(1 - inverseLerp(updateTime1, updateTime2, windowTime))
        }
        return 1
      }
      const activeTimeScale = getActiveTimeScale()

      // Time handling:
      const deltaTimeOld = this._tick.deltaTime
      const timeOld = this._tick.time
      const unscaledDeltaTime = Math.min(maxDeltaTime, windowDeltaTime) * timeScale
      const deltaTime = unscaledDeltaTime * activeTimeScale
      const paused = activeTimeScale === 0
      const time = timeOld + deltaTime

      const tick = new Tick(
        this._tick,
        frame,
        timeScale,
        time,
        deltaTime,
        unscaledDeltaTime,
        windowDeltaTime,
        maxDeltaTime,
        paused,
        activeLastRequest,
        activeDuration,
        activeFadeDuration,
        activeTimeScale)

      this._tick = tick

      const freezed =
        deltaTime === 0 // Current delta time should be zero.
        && deltaTimeOld === 0 // But the old delta time also (this allows one "zero-delta-time" callback).
        && time === timeOld // Time should not have been update by any other ways.

      if (freezed === false) {
        if (this._state.freezed) {
          this._unfreezeListeners.call(tick)
        }

        if (this.catchErrors === false) {
          this._updateListeners.call(tick)
        } else {
          try {
            this._updateListeners.call(tick)
          } catch (error) {
            this._state.caughtErrors = true
            console.error(`Clock loop caught an error. The loop is now broken.`)
            console.error(error)
          }
        }

        this._state.frame++
      } else {
        if (this._state.freezed === false) {
          // Last call before freezing.
          this._freezeListeners.call(tick)
        }
      }

      this._state.freezed = freezed
    }

    animationFrameCallbacks.add(update)

    this.destroy = () => {
      animationFrameCallbacks.delete(update)
      this.onUserInteractionListener?.destroy()
      this._freezeListeners.clear()
      this._unfreezeListeners.clear()
      this._updateListeners.clear()
    }
  }

  /**
   * "Uniform" time, meant to be used in shaders.
   */
  get uTime() {
    const getTime = () => this._tick.time % 1e3 // modulo 1e3 to avoid overflow.
    return { get value() { return getTime() } }
  }

  onTick(callback: TickCallback): DestroyableObject
  onTick(order: number, callback: TickCallback): DestroyableObject
  onTick(options: OnTickOptions, callback: TickCallback): DestroyableObject
  onTick(...args: any[]): DestroyableObject {
    function solveArgs(args: any[]): [OnTickOptions, TickCallback] {
      if (args.length === 1) {
        return [{}, args[0]]
      }
      if (typeof args[0] === 'number') {
        return [{ order: args[0] }, args[1]]
      }
      return args as any
    }

    const [options, callback] = solveArgs(args)
    const {
      order = 0,
      activeDuration,
      frameInterval = 0,
      timeInterval = 0,
      once = false,
    } = options

    if (once) {
      const listener = this.onTick({ ...options, once: false }, tick => {
        listener.destroy()
        callback(tick)
      })
      return listener
    }

    if (frameInterval > 0) {
      return this.onTick({ order, activeDuration }, tick => {
        if (tick.frame % frameInterval === 0) {
          return callback(tick)
        }
      })
    }

    if (timeInterval > 0) {
      let cumulativeTime = timeInterval
      return this.onTick({ order, activeDuration }, tick => {
        cumulativeTime += tick.deltaTime
        if (cumulativeTime >= timeInterval) {
          cumulativeTime += -timeInterval
          return callback(tick)
        }
      })
    }

    if (activeDuration !== undefined) {
      this.setActiveDuration(activeDuration)
    }
    this._updateListeners.add(order, callback)
    const destroy = () => {
      this._updateListeners.remove(callback)
    }

    return { destroy, value: this }
  }

  offTick(callback: TickCallback): boolean {
    return this._updateListeners.remove(callback)
  }

  /**
   * If a duration is provided, the clock will be updated constantly during this
   * interval, after which the activeDuration will apply again, before being
   * finally paused.
   */
  requestActivation = (activeDuration?: number): this => {
    this._state.requestAnimationFrame = activeDuration !== undefined
      ? Math.max(0, this._state.requestAnimationFrame, activeDuration)
      : Math.max(0, this._state.requestAnimationFrame)
    return this
  }

  /**
   * @deprecated Use {@link Ticker.requestActivation} instead.
   */
  requestUpdate = this.requestActivation

  private onUserInteractionListener: DestroyableObject | null = null
  requestActivationOnUserInteraction(element: HTMLElement = document.documentElement, activeDuration?: number): DestroyableObject {
    return this.onUserInteractionListener = onUserInteraction(element, () => this.requestActivation(activeDuration))
  }

  /**
   * Mock of window.requestAnimationFrame, with an order option.
   *
   * It's intended to be used in the same way as window.requestAnimationFrame,
   * and helps to use the clock instead of window.requestAnimationFrame.
   *
   * Since an order option is available, it's possible to insert the callback
   * to a specific position among the other callbacks.
   */
  requestAnimationFrame(callback: (ms: number) => void, { order = 0 } = {}): number {
    this.requestActivation() // Request activation to ensure the callback is called.
    const listener = this._updateListeners.add(order, tick => {
      this._updateListeners.removeById(listener.id)
      callback(tick.time * 1e3)
    })
    return listener.id
  }

  /**
   * Mock of window.cancelAnimationFrame that works with the clock.
   *
   * See {@link Ticker.requestAnimationFrame}
   */
  cancelAnimationFrame(id: number): boolean {
    return this._updateListeners.removeById(id)
  }

  /**
   * Set the "update" duration (in seconds). During this interval, the clock will
   * update constantly.
   */
  setActiveDuration(value: number): this {
    this._state.activeDuration = Math.max(0, value)
    return this
  }

  /**
   * @deprecated Use {@link Ticker.setActiveDuration} instead.
   */
  setUpdateDuration = this.setActiveDuration.bind(this)

  /**
   * Returns a promise that will be resolved at the next frame. The promise's
   * inner value is the current frame.
   */
  waitNextFrame(): Promise<number> {
    this.requestActivation()
    return new Promise<number>(resolve => {
      const callback = () => {
        this._updateListeners.remove(callback)
        resolve(this._state.frame)
      }
      this._updateListeners.add(0, callback)
    })
  }

  /**
   * Returns a promise that will be resolved at after a given amount of frames.
   * The promise's inner value is the current frame.
   */
  waitFrames(frameCount: number): number | Promise<number> {
    frameCount = Math.round(frameCount)
    if (frameCount <= 0) {
      return this._state.frame
    }
    let count = 0
    return new Promise<number>(resolve => {
      const callback = () => {
        count++
        this.requestUpdate()
        if (count === frameCount) {
          this._updateListeners.remove(callback)
          resolve(this._state.frame)
        }
      }
      this._updateListeners.add(0, callback)
    })
  }

  toString(): string {
    return `Clock { frame: ${this._state.frame}, time: ${this._tick.time.toFixed(3)}, deltaTime: ${this._tick.deltaTime.toFixed(3)} }`
  }
}

/**
 * A global clock that will pauses after some delay. Ideal for animation callbacks / heavy effects.
 */
const ticker = (() => {
  let ticker: Ticker
  return () => ticker ?? (ticker = new Ticker())
})()

/**
 * A global clock that never pauses.
 */
const windowTicker = (() => {
  let appTicker: Ticker
  return () => appTicker ?? (appTicker = new Ticker({ activeDuration: Infinity }))
})()



type ClockRequestUpdateOnUserInteractionArg = Partial<{
  element: HTMLElement
  activeDuration: number
}>
function solveClockRequestUpdateOnUserInteractionArgs(args: any[]): ClockRequestUpdateOnUserInteractionArg {
  if (args[0] instanceof HTMLElement) {
    return {
      element: args[0],
      ...args[1]
    }
  }
  return args as any
}

function tickerRequestActivationOnUserInteraction(element: HTMLElement, option?: { activeDuration?: number }): DestroyableObject // Backward compatibility
function tickerRequestActivationOnUserInteraction(arg?: ClockRequestUpdateOnUserInteractionArg): DestroyableObject
function tickerRequestActivationOnUserInteraction(...args: any[]): DestroyableObject {
  const {
    element = document.documentElement,
    activeDuration,
  } = solveClockRequestUpdateOnUserInteractionArgs(args)
  return onUserInteraction(element, () => ticker().requestActivation(activeDuration))
}

/**
 * @deprecated Use {@link tickerRequestActivationOnUserInteraction} instead.
 */
const tickerRequestUpdateOnUserInteraction = tickerRequestActivationOnUserInteraction

const onTick = ticker().onTick.bind(ticker())
const offTick = ticker().offTick.bind(ticker())

export {
  offTick,
  onTick,
  onUserInteraction,
  Ticker,
  ticker,
  tickerRequestActivationOnUserInteraction,
  tickerRequestUpdateOnUserInteraction,
  windowTicker
}

export type { Tick, TickCallback }


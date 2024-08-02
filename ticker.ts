import { inverseLerp } from './math/basics'
import { easeInOut2 } from './math/easing'
import { DestroyableObject } from './types'

type Tick = Readonly<{
  timeScale: number
  time: number
  timeOld: number
  frame: number
  deltaTime: number
  deltaTimeOld: number
  unscaledDeltaTime: number
  unscaledDeltaTimeOld: number
  windowDeltaTime: number
  maxDeltaTime: number
  paused: boolean

  /**
   * Duration of the "update" phase (in seconds). During this interval, the clock
   * will update constantly.
   */
  activeDuration: number
  /**
   * Duration of the "fade" phase (in seconds). During this interval, the clock
   * will progressively slow down to zero.
   */
  updateFadeDuration: number
  /**
   * Time scale during the "fade" phase. It goes from 1 to 0 and defaults to 1.
   */
  updateTimeScale: number
  /**
   * Last time the clock was requested to update (in "window" time which may differ from the current clock time).
   */
  updateLastRequest: number

  toString(): string
}>

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
  timeScale = 1
  maxDeltaTime = .1

  suspended = false
  suspendForceNextFrame = false
  suspend() { this.suspended = true }
  resume() { this.suspended = false }
  /** When set to `true`, the ticker will render the next frame even if it's suspended. */
  nextFrame() { this.suspendForceNextFrame = true }

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

  private _frame = 0
  private _updateListeners = new Listeners()
  private _freezeListeners = new Listeners()
  private _unfreezeListeners = new Listeners()
  private _freezed = false
  private _requestAnimationFrame = 0
  private _caughtErrors = false

  private _tick: Tick = {
    timeScale: 1,
    time: 0,
    timeOld: 0,
    frame: 0,
    maxDeltaTime: .1,
    deltaTime: 0,
    deltaTimeOld: 0,
    unscaledDeltaTime: 0,
    unscaledDeltaTimeOld: 0,
    windowDeltaTime: 0,
    paused: false,

    activeDuration: 3,
    updateFadeDuration: 1,
    updateTimeScale: 1,
    updateLastRequest: 0,
  }

  // Getters, Tick implementation.
  get time() { return this._tick.time }
  get timeOld() { return this._tick.timeOld }
  get frame() { return this._tick.frame }
  get deltaTime() { return this._tick.deltaTime }
  get deltaTimeOld() { return this._tick.deltaTimeOld }
  get unscaledDeltaTime() { return this._tick.unscaledDeltaTime }
  get unscaledDeltaTimeOld() { return this._tick.unscaledDeltaTimeOld }
  get windowDeltaTime() { return this._tick.windowDeltaTime }
  get paused() { return this._tick.paused }
  get activeDuration() { return this._tick.activeDuration }
  get updateFadeDuration() { return this._tick.updateFadeDuration }
  get updateTimeScale() { return this._tick.updateTimeScale }
  get updateLastRequest() { return this._tick.updateLastRequest }

  get freezed() { return this._freezed }
  get tick() { return this._tick }

  /**
   * @deprecated Use `tick` instead.
   */
  get state() { return this._tick }

  constructor({ activeDuration } = {} as { activeDuration?: number }) {
    if (activeDuration !== undefined) {
      this._tick = { ...this._tick, activeDuration }
    }

    const update = (windowDeltaTime: number) => {
      if ((this.suspended && this.suspendForceNextFrame === false) || this._caughtErrors) {
        return
      }

      // Reset the flag.
      this.suspendForceNextFrame = false

      // Auto-pause handling:
      const { activeDuration, updateFadeDuration } = this._tick
      let { updateLastRequest } = this._tick
      if (this._requestAnimationFrame >= 0) {
        this._requestAnimationFrame += -windowDeltaTime
        updateLastRequest = windowTime
      }

      const getUpdateTimeScale = () => {
        if (Number.isFinite(activeDuration)) {
          const updateTime1 = updateLastRequest + activeDuration
          const updateTime2 = updateTime1 + updateFadeDuration
          return easeInOut2(1 - inverseLerp(updateTime1, updateTime2, windowTime))
        }
        return 1
      }
      const updateTimeScale = getUpdateTimeScale()

      // Time handling:
      const { timeScale, maxDeltaTime } = this
      const deltaTimeOld = this._tick.deltaTime
      const unscaledDeltaTime = Math.min(maxDeltaTime, windowDeltaTime) * timeScale
      const deltaTime = unscaledDeltaTime * updateTimeScale
      const timeOld = this._tick.time
      const time = timeOld + deltaTime
      const frame = this._frame
      const tick = Object.freeze({
        frame,

        timeScale,
        deltaTimeOld,
        deltaTime,
        unscaledDeltaTimeOld: this._tick.unscaledDeltaTime,
        unscaledDeltaTime,
        windowDeltaTime,
        paused: updateTimeScale === 0,
        time,
        timeOld,
        maxDeltaTime,

        activeDuration,
        updateFadeDuration,
        updateTimeScale,
        updateLastRequest,

        toString: () => `Tick { frame: ${frame}, time: ${time.toFixed(3)}, deltaTime: ${deltaTime.toFixed(3)} }`,
      })
      this._tick = tick

      const freezed =
        deltaTime === 0 // Current delta time should be zero.
        && deltaTimeOld === 0 // But the old delta time also (this allows one "zero-delta-time" callback).
        && time === timeOld // Time should not have been update by any other ways.

      if (freezed === false) {
        if (this._freezed) {
          this._unfreezeListeners.call(tick)
        }

        if (this.catchErrors === false) {
          this._updateListeners.call(tick)
        } else {
          try {
            this._updateListeners.call(tick)
          } catch (error) {
            this._caughtErrors = true
            console.error(`Clock loop caught an error. The loop is now broken.`)
            console.error(error)
          }
        }

        this._frame++
      } else {
        if (this._freezed === false) {
          // Last call before freezing.
          this._freezeListeners.call(tick)
        }
      }

      this._freezed = freezed
    }

    animationFrameCallbacks.add(update)
    this.destroy = () => {
      animationFrameCallbacks.delete(update)
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
      this.setUpdateDuration(activeDuration)
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
  requestUpdate(duration?: number): this {
    this._requestAnimationFrame = duration !== undefined
      ? Math.max(0, this._requestAnimationFrame, duration)
      : Math.max(0, this._requestAnimationFrame)
    return this
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
    this.requestUpdate() // Request an update to ensure the callback is called.
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
  setUpdateDuration(value: number): this {
    this._tick = Object.freeze({
      ...this._tick,
      activeDuration: Math.max(0, value),
    })
    return this
  }

  /**
   * Returns a promise that will be resolved at the next frame. The promise's
   * inner value is the current frame.
   */
  waitNextFrame(): Promise<number> {
    this.requestUpdate()
    return new Promise<number>(resolve => {
      const callback = () => {
        this._updateListeners.remove(callback)
        resolve(this._frame)
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
      return this._frame
    }
    let count = 0
    return new Promise<number>(resolve => {
      const callback = () => {
        count++
        this.requestUpdate()
        if (count === frameCount) {
          this._updateListeners.remove(callback)
          resolve(this._frame)
        }
      }
      this._updateListeners.add(0, callback)
    })
  }

  toString(): string {
    return `Clock { frame: ${this._frame}, time: ${this._tick.time.toFixed(3)}, deltaTime: ${this._tick.deltaTime.toFixed(3)} }`
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

function tickerRequestUpdateOnUserInteraction(element: HTMLElement, option?: { activeDuration?: number }): DestroyableObject // Backward compatibility
function tickerRequestUpdateOnUserInteraction(arg?: ClockRequestUpdateOnUserInteractionArg): DestroyableObject
function tickerRequestUpdateOnUserInteraction(...args: any[]): DestroyableObject {
  const {
    element = document.documentElement,
    activeDuration,
  } = solveClockRequestUpdateOnUserInteractionArgs(args)
  return onUserInteraction(element, () => ticker().requestUpdate(activeDuration))
}

const onTick = ticker().onTick.bind(ticker())
const offTick = ticker().offTick.bind(ticker())

export {
  offTick,
  onTick,
  onUserInteraction,
  Ticker,
  ticker,
  tickerRequestUpdateOnUserInteraction,
  windowTicker
}

export type { Tick, TickCallback }


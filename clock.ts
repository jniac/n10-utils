import { inverseLerp } from './math/basics'
import { easeInOut2 } from './math/easing'
import { DestroyableObject } from './types'

type ClockState = Readonly<{
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
  updateDuration: number
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
}>

type ClockCallback = (state: ClockState) => void | 'stop'

let listenerNextId = 0
type Listener = Readonly<{
  id: number
  callback: ClockCallback
  order: number
}>

class Listeners {
  private _sortDirty = true
  private _countDirty = true
  private readonly _listeners: Listener[] = []
  private _loopListeners: Listener[] = []
  add(order: number, callback: ClockCallback): Listener {
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
  remove(callback: ClockCallback): boolean {
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
  call(state: ClockState) {
    if (this._sortDirty) {
      this._listeners.sort((A, B) => A.order - B.order)
      this._sortDirty = false
    }
    if (this._countDirty) {
      this._loopListeners = [...this._listeners]
      this._countDirty = false
    }
    for (const { callback } of this._loopListeners) {
      const result = callback(state)
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
  order: number
  updateDuration: number
  timeInterval: number
  frameInterval: number
}>

class Clock implements DestroyableObject, ClockState {
  timeScale = 1
  maxDeltaTime = .1

  suspended = false
  suspend() { this.suspended = true }
  resume() { this.suspended = false }

  // Destroyable implementation.
  destroy: () => void
  value() { return this }

  private _frame = 0
  private _updateListeners = new Listeners()
  private _freezeListeners = new Listeners()
  private _unfreezeListeners = new Listeners()
  private _freezed = false
  private _requestAnimationFrame = 0

  private _state: ClockState = {
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

    updateDuration: 3,
    updateFadeDuration: 1,
    updateTimeScale: 1,
    updateLastRequest: 0,
  }

  // Getters, ClockState implementation.
  get time() { return this._state.time }
  get timeOld() { return this._state.timeOld }
  get frame() { return this._state.frame }
  get deltaTime() { return this._state.deltaTime }
  get deltaTimeOld() { return this._state.deltaTimeOld }
  get unscaledDeltaTime() { return this._state.unscaledDeltaTime }
  get unscaledDeltaTimeOld() { return this._state.unscaledDeltaTimeOld }
  get windowDeltaTime() { return this._state.windowDeltaTime }
  get paused() { return this._state.paused }
  get updateDuration() { return this._state.updateDuration }
  get updateFadeDuration() { return this._state.updateFadeDuration }
  get updateTimeScale() { return this._state.updateTimeScale }
  get updateLastRequest() { return this._state.updateLastRequest }

  get freezed() { return this._freezed }
  get state() { return this._state }

  constructor({ updateDuration } = {} as { updateDuration?: number }) {
    if (updateDuration !== undefined) {
      this._state = { ...this._state, updateDuration }
    }

    const update = (windowDeltaTime: number) => {
      if (this.suspended) {
        return
      }

      // Auto-pause handling:
      let { updateDuration, updateFadeDuration, updateLastRequest } = this._state
      if (this._requestAnimationFrame >= 0) {
        this._requestAnimationFrame += -windowDeltaTime
        updateLastRequest = windowTime
      }

      const getUpdateTimeScale = () => {
        if (Number.isFinite(updateDuration)) {
          const updateTime1 = updateLastRequest + updateDuration
          const updateTime2 = updateTime1 + updateFadeDuration
          return easeInOut2(1 - inverseLerp(updateTime1, updateTime2, windowTime))
        }
        return 1
      }
      const updateTimeScale = getUpdateTimeScale()

      // Time handling:
      const { timeScale, maxDeltaTime } = this
      const deltaTimeOld = this._state.deltaTime
      const unscaledDeltaTime = Math.min(maxDeltaTime, windowDeltaTime) * timeScale
      const deltaTime = unscaledDeltaTime * updateTimeScale
      const timeOld = this._state.time
      const time = timeOld + deltaTime
      const state = Object.freeze({
        timeScale,
        deltaTimeOld,
        deltaTime,
        unscaledDeltaTimeOld: this._state.unscaledDeltaTime,
        unscaledDeltaTime,
        windowDeltaTime,
        paused: updateTimeScale === 0,
        time,
        timeOld,
        maxDeltaTime,
        frame: this._frame,

        updateDuration,
        updateFadeDuration,
        updateTimeScale,
        updateLastRequest,
      })
      this._state = state

      const freezed =
        deltaTime === 0 // Current delta time should be zero.
        && deltaTimeOld === 0 // But the old delta time also (this allows one "zero-delta-time" callback).
        && time === timeOld // Time should not have been update by any other ways.
      if (freezed === false) {
        if (this._freezed) {
          this._unfreezeListeners.call(state)
        }
        this._updateListeners.call(state)
        this._frame++
      } else {
        if (this._freezed === false) {
          this._freezeListeners.call(state)
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
    const getTime = () => this._state.time
    return { get value() { return getTime() } }
  }

  onTick(callback: ClockCallback): DestroyableObject
  onTick(order: number, callback: ClockCallback): DestroyableObject
  onTick(options: OnTickOptions, callback: ClockCallback): DestroyableObject
  onTick(...args: any[]): DestroyableObject {
    function solveArgs(args: any[]): [OnTickOptions, ClockCallback] {
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
      updateDuration,
      frameInterval = 0,
      timeInterval = 0,
    } = options

    if (frameInterval > 0) {
      return this.onTick({ order, updateDuration }, state => {
        if (state.frame % frameInterval === 0) {
          return callback(state)
        }
      })
    }

    if (timeInterval > 0) {
      let cumulativeTime = 0
      return this.onTick({ order, updateDuration }, state => {
        cumulativeTime += state.deltaTime
        if (cumulativeTime >= timeInterval) {
          cumulativeTime += -timeInterval
          return callback(state)
        }
      })
    }

    if (updateDuration !== undefined) {
      this.setUpdateDuration(updateDuration)
    }
    this._updateListeners.add(order, callback)
    const destroy = () => {
      this._updateListeners.remove(callback)
    }

    return { destroy, value: this }
  }

  /**
   * If a duration is provided, the clock will be updated constantly during this 
   * interval, after which the updateDuration will apply again, before being 
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
    const listener = this._updateListeners.add(order, state => {
      this._updateListeners.removeById(listener.id)
      callback(state.time * 1e3)
    })
    return listener.id
  }

  /**
   * Mock of window.cancelAnimationFrame that works with the clock.
   * 
   * See {@link Clock.requestAnimationFrame}
   */
  cancelAnimationFrame(id: number): boolean {
    return this._updateListeners.removeById(id)
  }

  /**
   * Set the "update" duration (in seconds). During this interval, the clock will
   * update constantly.
   */
  setUpdateDuration(value: number): this {
    this._state = Object.freeze({
      ...this._state,
      updateDuration: Math.max(0, value),
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
}

/**
 * A global clock that will pauses after some delay. Ideal for animation callbacks / heavy effects.
 */
const clock = (() => {
  let clock: Clock
  return () => clock ?? (clock = new Clock())
})()

/**
 * A global clock that never pauses.
 */
const appClock = (() => {
  let appClock: Clock
  return () => appClock ?? (appClock = new Clock({ updateDuration: Infinity }))
})()



type ClockRequestUpdateOnUserInteractionArg = Partial<{
  element: HTMLElement
  updateDuration: number
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

function clockRequestUpdateOnUserInteraction(element: HTMLElement, option?: { updateDuration?: number }): DestroyableObject // Backward compatibility
function clockRequestUpdateOnUserInteraction(arg?: ClockRequestUpdateOnUserInteractionArg): DestroyableObject
function clockRequestUpdateOnUserInteraction(...args: any[]): DestroyableObject {
  const {
    element = document.documentElement,
    updateDuration,
  } = solveClockRequestUpdateOnUserInteractionArgs(args)
  const onInteraction = () => {
    clock().requestUpdate(updateDuration)
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
  onInteraction()
  return { destroy }
}

const onTick = clock().onTick.bind(clock())

export type { ClockState }

export {
  Clock,
  appClock,
  clock,
  clockRequestUpdateOnUserInteraction,
  onTick
}


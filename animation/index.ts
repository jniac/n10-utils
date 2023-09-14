import { MultiKeyWeakMap } from '../collection/multi-key-map'
import { clamp01 } from '../math/basics'
import { isObject } from '../object/common'
import { expandObject } from '../object/expand'
import { EasingDeclaration, easing } from './easing'

type Callback = (animation: AnimationInstance) => void

class MultiValueMap<K, V> {
  static empty = [][Symbol.iterator]()
  map = new Map<K, Set<V>>()
  add(key: K, value: V) {
    const create = (key: K): Set<V> => {
      const set = new Set<V>()
      this.map.set(key, set)
      return set
    }
    const set = this.map.get(key) ?? create(key)
    set.add(value)
  }
  clear(key: K) {
    this.map.get(key)?.clear()
  }
  get(key: K): IterableIterator<V> {
    return this.map.get(key)?.[Symbol.iterator]() ?? MultiValueMap.empty
  }
}

const onUpdate = new MultiValueMap<number, Callback>()
const onDestroy = new MultiValueMap<number, Callback>()

const instanceWeakMap = new MultiKeyWeakMap<any, AnimationInstance>()

let animationInstanceCounter = 0
class AnimationInstance {
  readonly id = animationInstanceCounter++

  readonly duration: number
  readonly delay: number
  readonly target: any

  time: number = 0
  timeOld: number = 0
  progress: number = 0
  frame: number = 0

  constructor(duration: number, delay: number, target: any) {
    this.duration = duration
    this.delay = delay
    this.target = target
  }

  onUpdate(callback: Callback): this {
    onUpdate.add(this.id, callback)
    return this
  }

  onComplete(callback: Callback): this {
    return this.onUpdate(() => {
      if (this.progress === 1) {
        callback(this)
      }
    })
  }

  onDestroy(callback: Callback): this {
    onDestroy.add(this.id, callback)
    return this
  }
}

let instances: AnimationInstance[] = []

const destroyInstance = (instance: AnimationInstance) => {
  for (const callback of onDestroy.get(instance.id)) {
    callback(instance)
  }
  onUpdate.clear(instance.id)
  onDestroy.clear(instance.id)
}

const registerInstance = <T extends AnimationInstance>(instance: T): T => {
  const { target } = instance
  if (target !== undefined) {
    const existingInstance = instanceWeakMap.get(target)
    if (existingInstance) {
      destroyInstance(existingInstance)
    }
    instanceWeakMap.set(target, instance)
  }
  instances.push(instance)
  return instance
}

const updateInstances = (deltaTime: number) => {
  for (let i = 0, max = instances.length; i < max; i++) {
    const instance = instances[i]

    instance.timeOld = instance.time
    instance.time += deltaTime
    instance.progress = Number.isFinite(instance.duration)
      ? clamp01(instance.time / instance.duration)
      : 0 // progress is zero on infinite animation.
    instance.frame++

    for (const callback of onUpdate.get(instance.id)) {
      callback(instance)
    }
  }

  const instancesToBeDestroyed = new Set<AnimationInstance>()
  instances = instances.filter(instance => {
    if (instance.progress === 1) {
      instancesToBeDestroyed.add(instance)
      return false
    }
    return true
  })

  for (const instance of instancesToBeDestroyed) {
    destroyInstance(instance)
  }
}

let loopId = -1
function startAnimationLoop() {
  let msOld = window.performance.now()
  const loop = (ms: number) => {
    loopId = window.requestAnimationFrame(loop)
    const deltaTime = (-msOld + (msOld = ms)) / 1e3
    updateInstances(deltaTime)
  }
  loopId = window.requestAnimationFrame(loop)
}

function stopAnimationLoop() {
  window.cancelAnimationFrame(loopId)
}



// --------------[ During ]--------------- //

type DuringArg = {
  /** duration in seconds */
  duration: number
  /** delay in seconds */
  delay?: number
  target?: any
}

function during(arg: DuringArg): AnimationInstance
/**
 * 
 * @param duration duration in seconds
 */
function during(duration: number): AnimationInstance
function during(arg: any) {
  const [duration, delay, target] = (typeof arg === 'number'
    ? [arg, 0, undefined]
    : [arg.duration, arg.delay ?? 0, arg.target]
  ) as [number, number, any]
  return registerInstance(new AnimationInstance(duration, delay, target))
}



// --------------[ Tween ]--------------- //

const defaultTweenArg = {
  duration: 1,
  delay: 0,
  ease: 'inOut2' as EasingDeclaration,
}

type TweenEntry = {
  from: number
  to: number
  target: Record<string, any>
  key: string
}

function createTweenEntries(target: any, from: any, to: any, entries: TweenEntry[] = []): TweenEntry[] {
  if (Array.isArray(target)) {
    for (let index = 0, length = target.length; index < length; index++) {
      createTweenEntries(target[index], from, to, entries)
    }
    return entries
  }
  if (isObject(target) === false || isObject(from ?? to) === false) {
    // No possible tween, just ignore.
    return entries
  }
  for (const key in (from ?? to)) {
    const valueFrom = (from ?? target)[key]
    const valueTo = (to ?? target)[key]
    if (isObject(valueTo)) {
      if (isObject(valueFrom) === false) {
        throw new Error(`Tween from/to pair association error!`)
      } else {
        createTweenEntries(target[key], from && valueFrom, to && valueTo, entries)
      }
    } else {
      entries.push({ from: valueFrom, to: valueTo, key, target })
    }
  }
  return entries
}

type TweenInstanceAddArg = { target: any, from?: any, to?: any }
class TweenInstance extends AnimationInstance {
  entries: TweenEntry[] = []
  add(arg: TweenInstanceAddArg | TweenInstanceAddArg[]): this {
    const array = Array.isArray(arg) ? arg : [arg]
    for (const item of array) {
      createTweenEntries(
        item.target,
        expandObject(item.from),
        expandObject(item.to),
        this.entries,
      )
    }
    return this
  }
}

type TweenArg<T> = {
  target: T | T[]
} & Partial<typeof defaultTweenArg & {
  from: Record<string, any>
  to: Record<string, any>
}>

function tween<T extends Record<string, any>>(arg: TweenArg<T>): TweenInstance {
  const {
    duration,
    delay,
    ease,
    target,
    from,
    to,
  } = { ...defaultTweenArg, ...arg }
  const instance = registerInstance(new TweenInstance(duration, delay, target))
  if (from ?? to) {
    instance.add({ target, from, to })
  }
  const easingFunction = easing(ease)
  instance.onUpdate(({ progress }) => {
    const alpha = easingFunction(progress)
    const { entries } = instance
    for (let index = 0, length = entries.length; index < length; index++) {
      const { target, key, from, to } = entries[index]
      target[key] = from + (to - from) * alpha
    }
  })
  return instance
}

/**
 * Usage:
 * ```ts
 * Animation
 *   .during({ duration: 1, delay: .4, target: 'foo' })
 *   .onUpdate(({ progress }) => { })
 * 
 * Animation
 *   .during(1)
 *   .onUpdate(({ progress }) => {
 *   })
 * ```
 */
const AnimationBundle = {
  during,
  easing,
  tween,
  core: {
    updateInstances,
    startAnimationLoop,
    stopAnimationLoop,
  },
}

export type {
  Callback as AnimationCallback,
  TweenArg as AnimationTweenArg,
}

export {
  AnimationBundle as Animation,
}

// if (typeof window !== 'undefined') {
//   Object.assign(window, { Animation: AnimationBundle })
// }

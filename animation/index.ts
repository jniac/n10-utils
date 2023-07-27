import { clamp01 } from '../math/basics'
import { easing } from './easing'

type Callback = (animation: AnimationInstance) => void

class Register<K, V> {
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
  get(key: K) {
    return this.map.get(key)?.[Symbol.iterator]() ?? Register.empty
  }
}

const onUpdate = new Register<number, Callback>()
const onDestroy = new Register<number, Callback>()

const instanceMap = new Map<any, AnimationInstance>()

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

function during(arg: { duration: number, delay?: number, target?: any }): AnimationInstance
function during(duration: number): AnimationInstance
function during(arg: any) {
  const [duration, delay, target] = (typeof arg === 'number' ? [arg, 0, undefined] : [arg.duration, arg.delay ?? 0, arg.target]) as [number, number, any]
  const instance = new AnimationInstance(duration, delay, target)
  if (target !== undefined) {
    const existingInstance = instanceMap.get(target)
    if (existingInstance) {
      destroyInstance(existingInstance)
    }
    instanceMap.set(target, instance)
  }
  instances.push(instance)
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
const Animation = {
  during,
  easing,
  core: {
    updateInstances,
    startAnimationLoop,
    stopAnimationLoop,
  },
}

export type {
  Callback as AnimationCallback,
}

export {
  Animation,
}

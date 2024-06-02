import { Destroyable, DestroyableObject } from '../types'

const map = new WeakMap<DestroyableCollector, Destroyable[]>()

/**
 * Collects destroyable objects and destroys them all at once.
 * 
 * NOTE:   
 * The `destroy` method has been binded to the instance, and the collected 
 * destroyables are stored externally in a WeakMap, so you can pass the method 
 * to any other object. E.g.:
 * ```
 * function myEffect() {
 *   const destroy = new DestroyableCollector()
 *   destroy.add(subscribeToSomething())
 *   destroy.add(() => console.log('destroyed'))
 *   return {
 *     myProp: 'value',
 *     ...destroy, // only the `destroy` method is passed here
*    }
 * }
 * ```
 */
export class DestroyableCollector implements DestroyableObject {
  constructor(...destroyables: Destroyable[]) {
    this.add(...destroyables)
  }

  add(...destroyables: Destroyable[]): this {
    for (const destroyable of destroyables) {
      map.get(this)?.push(destroyable) ?? map.set(this, [destroyable])
    }
    return this
  }

  /**
   * Will add the destroyable if it has a `destroy` method or if it is a function.
   */
  safeAdd(...candidates: any[]): this {
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && 'destroy' in candidate) {
        this.add(candidate)
      } else if (typeof candidate === 'function') {
        this.add(candidate)
      }
    }
    return this
  }

  destroy = () => {
    const destroyables = map.get(this)
    if (destroyables) {
      for (const destroyable of destroyables) {
        if (typeof destroyable === 'function') {
          destroyable()
        } else {
          destroyable.destroy()
        }
      }
      map.delete(this)
    }
  }
}
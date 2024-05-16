import { Destroyable } from '../types'

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
export class DestroyableCollector {
  add(destroyable: Destroyable) {
    map.get(this)?.push(destroyable) ?? map.set(this, [destroyable])
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
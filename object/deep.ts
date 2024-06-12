import { DeepPartial } from '../types'

function isObject(value: any): value is object {
  return value !== null && typeof value === 'object'
}

/**
 * Clones an object deeply.
 *
 * NOTE:
 * - Objects are cloned by invoking their constructor, so they must be instantiable
 *   without arguments.
 */
export function deepClone<T>(target: T): T {
  // Primitives
  if (isObject(target) === false) {
    return target
  }

  // Objects
  // @ts-ignore
  const constructor = target.constructor
  if (constructor === RegExp || constructor === Date) {
    // @ts-ignore
    return new constructor(target)
  }

  // @ts-ignore
  const clone = new constructor()
  if (Array.isArray(target)) {
    for (let i = 0, len = target.length; i < len; i++) {
      clone[i] = deepClone(target[i])
    }
  } else {
    // @ts-ignore
    for (const [key, value] of Object.entries(target)) {
      clone[key] = deepClone(value)
    }
  }
  return clone
}

/**
 * Performs a deep copy of the `source` object into the `destination` object.
 *
 * Returns `true` if the destination object has changed.
 */
export function deepCopy<T extends object>(
  source: DeepPartial<T>,
  destination: T,
  allowNewKeys = false,
): boolean {
  let hasChanged = false

  function clone(srcValue: any, key: string | number) {
    // Objects:
    if (isObject(srcValue)) {
      // Dates:
      if (srcValue instanceof Date) {
        const destDate = (destination as any)[key] as Date
        if ((destDate instanceof Date) === false || destDate.getTime() !== srcValue.getTime()) {
          (destination as any)[key] = new Date(srcValue.getTime())
          hasChanged = true
        }
      }

      // Regular objects:
      else {
        hasChanged = deepCopy(srcValue, (destination as any)[key]) || hasChanged
      }
    }

    // Primitives:
    else {
      if ((destination as any)[key] !== srcValue) {
        (destination as any)[key] = srcValue
        hasChanged = true
      }
    }
  }

  if (Array.isArray(source)) {
    const len = allowNewKeys
      ? source.length
      : Math.min(source.length, (destination as any).length)
    for (let i = 0; i < len; i++) {
      const srcValue = source[i]
      clone(srcValue, i)
    }
  } else {
    for (const [key, srcValue] of Object.entries(source)) {
      if (allowNewKeys === false && key in destination === false) {
        continue
      }
      clone(srcValue, key)
    }
  }

  return hasChanged
}

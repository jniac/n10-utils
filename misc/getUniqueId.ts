import { MultiKeyWeakMap } from '../collection/multi-key-map'
import { Hash } from '../hash'
import { lazy } from '../lazy'

const init = lazy(() => {
  const map = new MultiKeyWeakMap<any, number>()
  let counter = 0
  const getUniqueId = (value: NonNullable<any>) => {
    const id = map.get(value)
    if (id !== undefined) {
      return id
    } else {
      Hash.init()
      const step = Array.isArray(value) ? value.length : 1
      for (let i = 0; i < step; i++) {
        Hash.update(counter++)
      }
      const id = Hash.getValueAsInt32()
      map.set(value, id)
      return id
    }
  }
  return { getUniqueId }
})

/**
 * Returns a unique id based on the passed value which may be a value, or an 
 * array of values.
 * 
 * NOTE: 
 * - The id is an "Int32"
 * - The id depends from the previous calls and may change from one session to 
 * another.
 * - For static, predictable id, use `digest()` instead which returns an unique
 * id based on the structure of an object (key / value pairs). Note that digest
 * may be slower because it requires to crawl recursiverly over any sub-properties.
 * - That function rely on `MultiKeyWeakMap` so feel free to push as many values
 * as you want, no need to release the pushed values since the references here are
 * weak (the only overhead may come from "value-type").
 */
export function getUniqueId(value: any) {
  return init().getUniqueId(value)
}

/**
 * MultiKeyWeakMap is for associating one or multiple keys to one value. 
 * 
 * Note:  
 * The key's order does not matter. Keys are handled as a set of keys.
 * 
 * Usage:
 * ```
 * // Single key usage:
 * console.log(mymap.get(obj1)) // undefined
 * mymap.set(obj1, 'foo')
 * console.log(mymap.get(obj1)) // "foo"
 * 
 * // Multiple keys usage:
 * console.log(mymap.get([obj1, obj2])) // undefined
 * mymap.set([obj1, obj2], 'bar')
 * // A value can be retrieved from an array of keys:
 * console.log(mymap.get([obj1, obj2])) // "bar"
 * // Order has no importance:
 * console.log(mymap.get([obj2, obj1])) // "bar"
 * 
 * // An existing value can be updated:
 * mymap.set([obj2, obj1], 'baz')
 * console.log(mymap.get([obj2, obj1])) // "baz"
 * console.log(mymap.get([obj1, obj2])) // "baz"
 * 
 * // Subset of keys cannot lead to the value: 
 * console.log(mymap.get([obj1])) // undefined
 * console.log(mymap.get([obj2])) // undefined
 * ```
*/
class MultiKeyWeakMap<K extends object = object, V = any> {
  private _map1 = new WeakMap<object, V>()
  private _map2 = new WeakMap<object, { keys: WeakSet<K>, keyCount: number, value: V }>()
  get(key: K | K[]): V | undefined {
    if (Array.isArray(key)) {
      const { _map2 } = this
      for (let index = 0, length = key.length; index < length; index++) {
        const bundle = _map2.get(key[index])
        if (bundle) {
          const { keyCount, keys, value } = bundle
          if (keyCount === length && key.every(item => keys.has(item))) {
            return value
          }
        }
      }
      return undefined
    } else {
      return this._map1.get(key)
    }
  }
  set(key: K | K[], value: V): void {
    if (Array.isArray(key)) {
      const { _map2 } = this
      // #1: Try to update an existing entry
      for (let index = 0, length = key.length; index < length; index++) {
        const bundle = _map2.get(key[index])
        if (bundle) {
          const { keyCount, keys } = bundle
          if (keyCount === length && key.every(item => keys.has(item))) {
            bundle.value = value
            return
          }
        }
      }
      // #2: If no existing entry, create a new one
      _map2.set(key[0], { keys: new Set(key), keyCount: key.length, value })
    } else {
      this._map1.set(key, value)
    }
  }
}

export {
  MultiKeyWeakMap,
}
import { DestroyableObject } from '../types'
import { ConstructorOptions, Observable } from './observable'

const { reduceFlags, expandFlags } = (() => {
  /**
   * A global cache for flag maps. This is used to optimize the conversion between
   * flags and their indexes.
   */
  const cache = new WeakMap<readonly any[], Map<any, number>>()

  function getMap(flags: readonly any[]): Map<any, number> {
    let map = cache.get(flags)
    if (map === undefined) {
      map = new Map()
      for (let i = 0; i < flags.length; i++) {
        map.set(flags[i], i)
      }
      cache.set(flags, map)
    }
    return map
  }

  /**
   * Reduces a set of flags to a single value (BigInt).
   */
  function reduceFlags(flags: readonly any[], ...activeFlags: any[]): bigint {
    const map = getMap(flags)
    return activeFlags.reduce((acc, flag) => {
      const index = map.get(flag)
      return index === undefined ? acc : acc | BigInt(1 << index)
    }, BigInt(0))
  }

  function expandFlags<T>(flags: readonly T[], value: bigint): T[] {
    const map = getMap(flags)
    const activeFlags: any[] = []
    for (const [flag, index] of map) {
      if ((value & BigInt(1 << index)) !== BigInt(0)) {
        activeFlags.push(flag)
      }
    }
    return activeFlags
  }

  return {
    reduceFlags,
    expandFlags,
  }
})()

function reduceFlagIndexes(...activeIndexes: number[]): bigint {
  let mask = BigInt(0)
  for (const index of activeIndexes) {
    mask |= BigInt(1 << index)
  }
  return mask
}

/**
 * An observable that can switch between a set of values.
 * 
 * NOTE: still WIP
 */
class ObservableFlags<Flags extends readonly Flag[] = any[], Flag = Flags[number]> extends Observable<bigint> {
  private _allFlags: Flags

  get allFlags() {
    return this._allFlags
  }

  get currentFlags(): Flag[] {
    return expandFlags(this._allFlags, this._value)
  }

  get addedFlags(): Flag[] {
    return expandFlags(this._allFlags, this._value & ~this._valueOld)
  }

  get removedFlags(): Flag[] {
    return expandFlags(this._allFlags, this._valueOld & ~this._value)
  }

  constructor(flags: Flags, initialValue: bigint | Flag[] = BigInt(0), options?: ConstructorOptions<bigint>) {
    if (Array.isArray(initialValue)) {
      initialValue = reduceFlags(flags, ...initialValue)
    }
    super(initialValue, options)
    this._allFlags = flags
  }

  has(flag: Flag): boolean {
    return (this.value & reduceFlags(this._allFlags, flag)) !== BigInt(0)
  }

  hasOld(flag: Flag): boolean {
    return (this.valueOld & reduceFlags(this._allFlags, flag)) !== BigInt(0)
  }

  hasAll(...flags: Flag[]): boolean {
    return flags.every(flag => this.has(flag))
  }

  hasAllOld(...flags: Flag[]): boolean {
    return flags.every(flag => this.hasOld(flag))
  }

  hasAny(...flags: Flag[]): boolean {
    return flags.some(flag => this.has(flag))
  }

  hasAnyOld(...flags: Flag[]): boolean {
    return flags.some(flag => this.hasOld(flag))
  }

  hasNone(...flags: Flag[]): boolean {
    return !flags.some(flag => this.has(flag))
  }

  hasNoneOld(...flags: Flag[]): boolean {
    return !flags.some(flag => this.hasOld(flag))
  }

  toggle(...flags: Flag[]): boolean {
    let { value } = this
    for (const flag of flags) {
      value ^= reduceFlags(this._allFlags, flag)
    }
    return this.setValue(value)
  }

  update({
    add = [],
    remove = [],
  }: Partial<{
    add: Flag[] | number[]
    remove: Flag[] | number[]
  }>): boolean {
    let { value } = this
    if (add.length > 0) {
      if (typeof add[0] === 'number') {
        for (const index of add as number[]) {
          value |= reduceFlagIndexes(index)
        }
      } else {
        for (const flag of add) {
          value |= reduceFlags(this._allFlags, flag)
        }
      }
    }
    if (remove.length > 0) {
      if (typeof remove[0] === 'number') {
        for (const index of remove as number[]) {
          value &= ~reduceFlagIndexes(index)
        }
      } else {
        for (const flag of remove) {
          value &= ~reduceFlags(this._allFlags, flag)
        }
      }
    }
    return this.setValue(value)
  }

  add(...flags: Flag[]): boolean {
    return this.update({ add: flags })
  }

  remove(...flags: Flag[]): boolean {
    return this.update({ remove: flags })
  }

  /**
   * Sets the flags to the given values.
   */
  setFlags(...flags: Flag[]): boolean
  setFlags(...flagIndexes: number[]): boolean
  setFlags(...flags: any[]): boolean {
    const value = typeof flags[0] === 'number'
      ? reduceFlagIndexes(...flags as number[])
      : reduceFlags(this._allFlags, ...flags)
    return this.setValue(value)
  }

  clear(): void {
    this.value = BigInt(0)
  }

  fill(): this {
    this.value = BigInt((2 << this._allFlags.length) - 1)
    return this
  }

  onMatch(matchParams: {
    /**
     * All flags that must be active.
     */
    all?: Flag[],
    /**
     * At least one of these flags must be active.
     */
    any?: Flag[],
    /**
     * None of these flags must be active.
     */
    none?: Flag[],
    /**
     * If true, the callback will be called immediately (without waiting for the next change).
     */
    executeImmediately?: boolean,
    /**
     * Callback that will be called when the flags match again or not anymore.
     */
    callback?: (match: boolean, obs: ObservableFlags<Flags, Flag>) => void,
    /**
     * Callback that will be called when the flags match the conditions again.
     */
    on?: (match: boolean, obs: ObservableFlags<Flags, Flag>) => void,
    /**
     * Callback that will be called when the flags do not match the conditions anymore.
     */
    off?: (match: boolean, obs: ObservableFlags<Flags, Flag>) => void,
  }): DestroyableObject {
    const {
      all = [],
      any = this._allFlags,
      none = [],
      executeImmediately = true,
      callback,
      on,
      off,
    } = matchParams
    const allMask = reduceFlags(this._allFlags, ...all)
    const anyMask = reduceFlags(this._allFlags, ...any)
    const noneMask = reduceFlags(this._allFlags, ...none)

    function computeMatch(value: bigint): boolean {
      const hasAll = (value & allMask) === allMask
      const hasAny = (value & anyMask) !== BigInt(0)
      const hasNone = (value & noneMask) === BigInt(0)
      return hasAll && hasAny && hasNone
    }

    const match = computeMatch(this.value)
    if (executeImmediately) {
      callback?.(match, this)
      if (match) {
        on?.(match, this)
      } else {
        off?.(match, this)
      }
    }

    let matchOld = match
    return this.onChange(value => {
      const match = computeMatch(value)
      if (match !== matchOld) {
        callback?.(match, this)
        if (match) {
          on?.(match, this)
        } else {
          off?.(match, this)
        }
        matchOld = match
      }
    })
  }

  toDebugString(): string {
    const str = this._allFlags
      .map((flag, index) => {
        const active = this.has(flag)
        return `  ${index} ${flag}${active ? '(X)' : '(_)'}`
      })
      .join('\n')
    return `${this.constructor.name}: (X/_)\n${str}`
  }

  logDebugString(): this {
    console.log(this.toDebugString())
    return this
  }
}

// function test() {
//   const o = new ObservableFlags(['foo', 'bar', 'qux'])

//   o.onChange(() => {
//     console.log(`\n`)
//     o.logDebugString()
//   })

//   o.onMatch({
//     all: ['foo'],
//     any: ['foo', 'qux'],
//     none: ['bar'],
//     callback: match => {
//       console.log(match ? 'OOOOK!!' : 'KO...')
//     },
//   })

//   o.update({
//     add: ['foo', 'bar'],
//     remove: [],
//   })

//   o.add('qux')
//   o.remove('bar')
//   o.remove('qux')
//   o.remove('foo')
// }

export { ObservableFlags }


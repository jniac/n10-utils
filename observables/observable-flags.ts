import { ConstructorOptions, Observable } from './observable'

const { reduceFlags, expandFlags } = (() => {
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

  hasAll(...flags: Flag[]): boolean {
    return flags.every(flag => this.has(flag))
  }

  hasAny(...flags: Flag[]): boolean {
    return flags.some(flag => this.has(flag))
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
    add: Flag[]
    remove: Flag[]
  }>): boolean {
    let { value } = this
    for (const flag of add) {
      value |= reduceFlags(this._allFlags, flag)
    }
    for (const flag of remove) {
      value &= ~reduceFlags(this._allFlags, flag)
    }
    return this.setValue(value)
  }

  add(...flags: Flag[]): boolean {
    return this.update({ add: flags })
  }

  remove(...flags: Flag[]): boolean {
    return this.update({ remove: flags })
  }

  set(active: boolean, ...flags: Flag[]): boolean {
    return active ? this.add(...flags) : this.remove(...flags)
  }

  clear(): void {
    this.value = BigInt(0)
  }

  fill(): this {
    this.value = BigInt((2 << this._allFlags.length) - 1)
    return this
  }

  toDebugString(): string {
    const str = this._allFlags
      .map(flag => {
        const active = this.has(flag)
        return `  ${flag}${active ? ' (active)' : ''}`
      })
      .join('\n')
    return `${this.constructor.name}:\n${str}`
  }

  logDebugString(): this {
    console.log(this.toDebugString())
    return this
  }
}

export { ObservableFlags }


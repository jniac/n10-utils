type CallbackArg<T> = ((arg: T) => void) | null | undefined
type CallbackOptions =  Partial<{ once: boolean}>

/**
 * This has one purpose only: avoid "callback-overflow" by ensuring that any
 * new callback added during an "invoke()" call will not be called during the 
 * same "invoke()" call.
 */
export class CallbackStack<T> {
  private _mainSet = new Set<(arg: T) => void>()
  private _waitSet = new Set<(arg: T) => void>()
  private _lock = false

  add(options: CallbackOptions, callback: CallbackArg<T>): this
  add(callback: CallbackArg<T>): this
  add(...args: any[]): this {
    let [{ once = false }, callback] = (args.length === 2 ? args : [{}, args[0]]) as [CallbackOptions, CallbackArg<T>]
    if (!callback) {
      return this
    }
    if (once) {
      const originalCallback = callback
      callback = (arg: T) => {
        originalCallback(arg)
        this.remove(callback)
      }
    }
    if (this._lock === false) {
      this._mainSet.add(callback)
    } else {
      this._waitSet.add(callback)
    }
    return this
  }

  remove(callback: CallbackArg<T>): this {
    if (!callback) {
      return this
    }
    this._mainSet.delete(callback)
    this._waitSet.delete(callback)
    return this
  }

  invoke(arg: T): this {
    this._lock = true
    for (const callback of this._mainSet) {
      callback(arg)
    }
    for (const callback of this._waitSet) {
      this._mainSet.add(callback)
    }
    this._waitSet.clear()
    this._lock = false
    return this
  }
}
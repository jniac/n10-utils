import { DestroyableObject, StringFilter } from '../types'
import { IdRegister } from './IdRegister'

type Callback<P extends object = any> = {
  (message: Message<P>): void
}

class Listener {
  filter: StringFilter
  callback: Callback
  match: (type: string) => boolean
  constructor(filter: StringFilter, callback: Callback) {
    this.filter = filter
    this.callback = callback
    this.match = (
      filter === '*' ? () => true :
        typeof filter === 'string' ? (type: string) => type === filter :
          filter instanceof RegExp ? (type: string) => filter.test(type) :
            () => false)
  }
}

const idRegister = new IdRegister()
const listenerMap = new Map<number, Listener[]>()

function requireListeners(id: number): Listener[] {
  return listenerMap.get(id) ?? (() => {
    const listeners: Listener[] = []
    listenerMap.set(id, listeners)
    return listeners
  })()
}

function removeListener(id: number, listener: Listener): boolean {
  const listeners = listenerMap.get(id)
  if (listeners) {
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
      if (listeners.length === 0) {
        listenerMap.delete(id)
      }
      return true
    }
  }
  return false
}
/**
 * Send a message:
 * ```
 * Message.send(myTarget, 'hello')
 * ```
 * Subscribe to a message:
 * ```
 * Message.on<string>(myTarget, m => {
 *   console.log(m.payload) // "hello" from the previous message
 * })
 * ```
 * Ok, but what is "myTarget" here?
 * # Absolutely everything!
 * It could be:
 * - a primitive (1, "FOO", Symbol() etc.)
 * - a object
 * - any combination of the two
 * ```
 * const secretKey = Symbol('secret')
 * 
 * type UserAuth = {
 *   ok: boolean
 *   info: string
 * }
 * 
 * Message.on<UserAuth>([window, 'USER_AUTH', secretKey], m => {
 *   const { ok, info } = m.payload!
 *   if (ok) {
 *     proceed()
 *   } else {
 *     console.log(info)
 *   }
 * })
 * 
 * Message.send<UserAuth>([window, 'USER_AUTH', secretKey],
 *   { ok: true, info: 'The user has logged in.' })
 * 
 * Message.send<UserAuth>([window, 'USER_AUTH', secretKey], 
 *   { ok: false, info: 'The user failed to log in.' })
 * ```
 */
class Message<P extends object = any> {
  static send = send
  static on = on
  private static count = 0
  readonly id = Message.count++
  readonly targetId: number
  target: any
  type: string
  payload?: P
  constructor(target: any, type?: string, payload?: P) {
    this.targetId = idRegister.requireId(target)
    this.target = target
    this.type = type ?? 'message'
    this.payload = payload

    for (const listener of listenerMap.get(this.targetId) ?? []) {
      if (listener.match(this.type)) {
        listener.callback(this)
      }
    }
  }
}

function solveOnArgs<P extends object = any>(args: any[]): [target: any, filter: StringFilter, callback: Callback<P>] {
  if (args.length === 2) {
    const [target, callback] = args
    return [target, '*', callback]
  }
  return args as any
}
/**
 * Add a callback to a target.
 * ```
 * Message.on<{ ok: boolean }>('USER', m => {
 *   const { ok } = m.payload!
 * })
 * ```
 * A "string filter" can be specified: 
 * ```
 * Message.on<{ ok: boolean }>('USER', /AUTH/, m => {
 *   const { ok } = m.payload!
 * })
 * ```
 */
function on<P extends object = any>(target: any, callback: (message: Message<P>) => void): DestroyableObject
function on<P extends object = any>(target: any, filter: StringFilter, callback: (message: Message<P>) => void): DestroyableObject
function on<P extends object = any>(...args: any): DestroyableObject {
  const [target, filter, callback] = solveOnArgs<P>(args)
  const targetId = idRegister.requireId(target)
  const listener = new Listener(filter, callback)
  requireListeners(targetId).push(listener)
  const destroy = () => {
    removeListener(targetId, listener)
  }
  return { destroy }
}

function solveSendArgs<P extends object = any>(args: any[]): [target: any, type?: string, payload?: P] {
  const [target, ...rest] = args
  if (rest.length === 2) {
    return args as any
  }
  if (rest.length === 1) {
    const [arg2] = rest
    return typeof arg2 === 'string' ? [target, arg2] : [target, undefined, arg2]
  }
  return [target]
}

function send<P extends object = any>(target: any): Message
function send<P extends object = any>(target: any, type: string): Message
function send<P extends object = any>(target: any, payload: P): Message
function send<P extends object = any>(target: any, type: string, payload: P): Message
function send<P extends object = any>(...args: any[]): Message {
  const [target, type, payload] = solveSendArgs<P>(args)
  return new Message(target, type, payload)
}

export type { Listener as MessageListener }
export { Message }

import { DestroyableObject } from '../types'
import { IdRegister } from './IdRegister'

type MessageCallback<T = any> = {
  (message: Message<T>): void
}

const idRegister = new IdRegister()
const callbackMap = new Map<number, MessageCallback[]>()
function requireCallbacks(id: number): MessageCallback[] {
  return callbackMap.get(id) ?? (() => {
    const callbacks: MessageCallback[] = []
    callbackMap.set(id, callbacks)
    return callbacks
  })()
}

function removeListener(id: number, listener: MessageCallback): boolean {
  const callbacks = callbackMap.get(id)
  if (callbacks) {
    const index = callbacks.indexOf(listener)
    if (index !== -1) {
      callbacks.splice(index, 1)
      if (callbacks.length === 0) {
        callbackMap.delete(id)
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
class Message<T = any> {
  static send = send
  static on = on
  private static count = 0
  readonly id = Message.count++
  readonly targetId: number
  target: any
  payload?: T
  constructor(target: any, payload?: T) {
    this.targetId = idRegister.requireId(target)
    this.target = target
    this.payload = payload

    for (const callback of callbackMap.get(this.targetId) ?? []) {
      callback(this)
    }
  }
}

function on<T = any>(target: any, callback: (message: Message<T>) => void): DestroyableObject {
  const targetId = idRegister.requireId(target)
  requireCallbacks(targetId).push(callback)
  const destroy = () => {
    removeListener(targetId, callback)
  }
  return { destroy }
}

function send<T = any>(target: any, payload?: T) {
  return new Message(target, payload)
}

export type { MessageCallback }
export { Message }

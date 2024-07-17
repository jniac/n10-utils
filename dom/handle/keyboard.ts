import { applyStringFilter } from '../../string'
import { Destroyable, StringFilter } from '../../types'

type Info = {
  event: KeyboardEvent
}

const defaultOptions = {
  preventDefault: false,
}

type Options = Partial<typeof defaultOptions>

const defaultKeyboardFilter = {
  key: '*' as StringFilter,
  code: '*' as StringFilter,
  noModifiers: false
}

type KeyboardFilter = typeof defaultKeyboardFilter

type KeyboardFilterDeclaration =
  | StringFilter
  | Partial<KeyboardFilter>


function solveKeyboardFilter(filter: KeyboardFilterDeclaration) {
  if (typeof filter === 'string') {
    return { ...defaultKeyboardFilter, key: filter }
  }
  return { ...defaultKeyboardFilter, ...filter }
}

type KeyboardListenerEntry = [
  filter: KeyboardFilterDeclaration,
  callback: (info: Info) => void,
]

function solveArgs(args: any[]): [HTMLElement, Options, KeyboardListenerEntry[]] {
  if (args.length === 1) {
    return [document.documentElement, {}, args[0]]
  }
  if (args.length === 2) {
    return [args[0], {}, args[1]]
  }
  return args as any
}

export function handleKeyboard(listeners: KeyboardListenerEntry[]): Destroyable
export function handleKeyboard(target: HTMLElement, listeners: KeyboardListenerEntry[]): Destroyable
export function handleKeyboard(target: HTMLElement, options: Options, listeners: KeyboardListenerEntry[]): Destroyable
export function handleKeyboard(...args: any[]): Destroyable {
  const [target, options, listeners] = solveArgs(args)
  const { preventDefault } = { ...defaultOptions, ...options }
  const onKeyDown = (event: KeyboardEvent): void => {
    const info: Info = { event }
    for (let i = 0, max = listeners.length; i < max; i++) {
      const [filter, callback] = listeners[i]
      const { key, code, noModifiers } = solveKeyboardFilter(filter)
      const match =
        applyStringFilter(event.key, key)
        && applyStringFilter(event.code, code)
        && (!noModifiers || (event.ctrlKey === false && event.altKey === false && event.shiftKey === false && event.metaKey === false))
      if (match) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback(info)
      }
    }
  }
  target.addEventListener('keydown', onKeyDown, { passive: false })
  const destroy = () => {
    target.removeEventListener('keydown', onKeyDown)
  }
  return { destroy }
}

import { applyStringMatcher } from '../../string'
import { Destroyable, StringMatcher } from '../../types'

type Info = {
  event: KeyboardEvent
}

const defaultOptions = {
  preventDefault: false,
}

type Options = Partial<typeof defaultOptions>

type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta'
type Combination<T extends string, U extends string = T> =
  T extends any
  ? T | `${T}+${Combination<Exclude<U, T>>}`
  : never
type Modifiers = '' | Combination<Modifier>

const defaultKeyboardFilter = {
  key: '*' as StringMatcher,
  keyCaseInsensitive: true,
  code: '*' as StringMatcher,
  noModifiers: false,
  modifiers: '' as Modifiers,
}

type KeyboardFilter = typeof defaultKeyboardFilter

type KeyboardFilterDeclaration =
  | StringMatcher
  | Partial<KeyboardFilter>


function solveKeyboardFilter(filter: KeyboardFilterDeclaration): KeyboardFilter {
  const result: KeyboardFilter = typeof filter === 'string'
    ? { ...defaultKeyboardFilter, key: filter }
    : { ...defaultKeyboardFilter, ...filter }
  if (result.keyCaseInsensitive && typeof result.key === 'string') {
    result.key = result.key.toLowerCase()
  }
  return result
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
      const { key, keyCaseInsensitive, code, noModifiers, modifiers } = solveKeyboardFilter(filter)
      const { ctrl = false, alt = false, shift = false, meta = false } = Object.fromEntries(modifiers.split('-').map(modifier => [modifier, true]))
      const { ctrlKey, altKey, shiftKey, metaKey } = event

      const eventKey = keyCaseInsensitive ? event.key.toLowerCase() : event.key
      const matches = {
        key: applyStringMatcher(eventKey, key),
        code: applyStringMatcher(event.code, code),
        noModifiers: !noModifiers || (ctrlKey === false && altKey === false && shiftKey === false && metaKey === false),
        modifiers: !modifiers || (ctrl === ctrlKey && alt === altKey && shift === shiftKey && meta === metaKey),
      }

      const match = Object.values(matches).every(Boolean)
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

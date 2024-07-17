import { applyStringFilter } from '../../string'
import { Destroyable, StringFilter } from '../../types'

type Info = {
  event: KeyboardEvent
}

const defaultOptions = {
  preventDefault: false,
}

type Options = Partial<typeof defaultOptions>

type KeyboardListenerEntry = [
  filter: StringFilter | { key: StringFilter } | { code: StringFilter },
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
      const match =
        typeof filter === 'string' ? applyStringFilter(event.key, filter) :
          'key' in filter ? applyStringFilter(event.key, filter.key) :
            'code' in filter ? applyStringFilter(event.code, filter.code) :
              false
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

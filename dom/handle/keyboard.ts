import { Destroyable, StringFilter } from '@/n10-utils/types'
import { applyStringFilter } from '@/n10-utils/string'

type Info = {
  event: KeyboardEvent
}

type KeyboardListenerEntry = [
  filter: StringFilter, 
  callback: (info: Info) => void,
]

export function handleKeyboard(listeners: KeyboardListenerEntry[]): Destroyable {
  const onKeyDown = (event: KeyboardEvent): void => {
    const info: Info = { event }
    for (let i = 0, max = listeners.length; i < max; i++) {
      const [filter, callback] = listeners[i]
      if (applyStringFilter(event.code, filter)) {
        callback(info)
      }
    }
  }
  window.addEventListener('keydown', onKeyDown)
  const destroy = () => {
    window.removeEventListener('keydown', onKeyDown)
  }
  return { destroy }
}

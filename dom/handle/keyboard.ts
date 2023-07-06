import { Destroyable, StringFilter } from '@/n10-utils/types'
import { applyStringFilter } from '@/n10-utils/string'

export function handleKeyboard(listeners: [filter: StringFilter, callback: (event: KeyboardEvent) => void][]): Destroyable {
  const onKeyDown = (event: KeyboardEvent): void => {
    for (let i = 0, max = listeners.length; i < max; i++) {
      const [filter, callback] = listeners[i]
      if (applyStringFilter(event.code, filter)) {
        callback(event)
      }
    }
  }
  window.addEventListener('keydown', onKeyDown)
  const destroy = () => {
    window.removeEventListener('keydown', onKeyDown)
  }
  return { destroy }
}

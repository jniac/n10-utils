import { StringFilter } from './types'

export function applyStringFilter(str: string, filter: StringFilter) {
  switch (typeof filter) {
    case 'string': {
      return str === filter
    }
    case 'function': {
      return filter(str)
    }
    default: {
      return filter.test(str)
    }
  }
}

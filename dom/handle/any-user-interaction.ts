import { DestroyableObject } from '../../types'

type Options = Partial<{ target: HTMLElement | Window }>
export function handleAnyUserInteraction(options: Options, onInteraction: (event: Event) => void): DestroyableObject
export function handleAnyUserInteraction(target: HTMLElement | Window, onInteraction: (event: Event) => void): DestroyableObject
export function handleAnyUserInteraction(onInteraction: (event: Event) => void): DestroyableObject
export function handleAnyUserInteraction(...args: any[]) {
  function solveArgs(args: any[]): [Options, (event: Event) => void] {
    if (args.length === 1) {
      return [{}, args[0]]
    } else {
      const [object, onInteraction] = args
      if (object instanceof Window || object instanceof HTMLElement) {
        return [{ target: object }, onInteraction]
      }
      return args as any
    }
  }
  const [options, onInteraction] = solveArgs(args)
  const { target = window } = options
  const _onInteraction = (event: Event) => {
    onInteraction(event)
  }
  target.addEventListener('mousemove', _onInteraction)
  target.addEventListener('mousedown', _onInteraction)
  target.addEventListener('mouseup', _onInteraction)
  target.addEventListener('touchstart', _onInteraction)
  target.addEventListener('touchmove', _onInteraction)
  target.addEventListener('wheel', _onInteraction)
  target.addEventListener('keydown', _onInteraction)
  target.addEventListener('keyup', _onInteraction)
  const destroy = () => {
    target.removeEventListener('mousemove', _onInteraction)
    target.removeEventListener('mousedown', _onInteraction)
    target.removeEventListener('mouseup', _onInteraction)
    target.removeEventListener('touchstart', _onInteraction)
    target.removeEventListener('touchmove', _onInteraction)
    target.removeEventListener('wheel', _onInteraction)
    target.removeEventListener('keydown', _onInteraction)
    target.removeEventListener('keyup', _onInteraction)
  }
  return { destroy }
}

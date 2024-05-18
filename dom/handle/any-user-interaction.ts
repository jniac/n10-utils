import { DestroyableObject } from '../../types'

type Options = Partial<{ target: HTMLElement | Window }>
export function handleAnyUserInteraction(options: Options, onInteraction: (event: Event) => void): DestroyableObject
export function handleAnyUserInteraction(onInteraction: (event: Event) => void): DestroyableObject
export function handleAnyUserInteraction(...args: any[]) {
  const [options, onInteraction] = (args.length === 1
    ? [{}, args[0]]
    : args
  ) as [Options, (event: Event) => void]
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

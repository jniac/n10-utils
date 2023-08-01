import { HandleDragParams, handleDrag, hasDragCallback } from './drag'
import { HandleTapParams, handleTap, hasTapCallback } from './tap'
import { HandlePressParams, handlePress, hasPressCallback } from './press'

type Params = HandleDragParams & HandlePressParams & HandleTapParams

export function handlePointer(target: HTMLElement, params: Params): () => void {
  const destroyCallbacks: (() => void)[] = []
  if (hasDragCallback(params)) {
    destroyCallbacks.push(handleDrag(target, params))
  }
  if (hasPressCallback(params)) {
    destroyCallbacks.push(handlePress(target, params))
  }
  if (hasTapCallback(params)) {
    destroyCallbacks.push(handleTap(target, params))
  }
  return () => {
    for (const callback of destroyCallbacks) {
      callback()
    }
  }
}
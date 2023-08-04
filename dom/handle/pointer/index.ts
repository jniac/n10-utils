import { HandleBasicPointerParams, handleBasicPointer, hasBasicPointerCallback } from './basic'
import { HandleDragParams, handleDrag, hasDragCallback } from './drag'
import { HandlePressParams, handlePress, hasPressCallback } from './press'
import { HandleTapParams, handleTap, hasTapCallback } from './tap'

type Params = HandleBasicPointerParams & HandleDragParams & HandlePressParams & HandleTapParams

export function handlePointer(target: HTMLElement, params: Params): () => void {
  const destroyCallbacks: (() => void)[] = []
  if (hasBasicPointerCallback(params)) {
    destroyCallbacks.push(handleBasicPointer(target, params))
  }
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
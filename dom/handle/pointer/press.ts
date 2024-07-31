import { Rectangle } from '../../../math/geom/Rectangle'
import { PointerTarget } from './type'

type PressInfo = {
  position: DOMPoint
  delta: DOMPoint
  target: PointerTarget
  targetRectOnDown: Rectangle
  pointerIsInside: boolean
}

type Callback = (info: PressInfo) => void

const callbackNames = [
  'onPressStart',
  'onPressStop',
  'onPressFrame',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<Record<CallbackName, Callback>>

function hasPressCallback(params: Record<string, any>): boolean {
  return callbackNames.some(name => name in params)
}

function handlePress(element: PointerTarget, params: Params) {
  const {
    onPressStart,
    onPressStop,
    onPressFrame,
  } = params

  let dragged = false
  let frameID = -1
  const pointer = new DOMPoint(0, 0)
  const position = new DOMPoint(0, 0)
  const delta = new DOMPoint(0, 0)
  const info: PressInfo = {
    position,
    delta,
    target: element,
    targetRectOnDown: new Rectangle(),
    get pointerIsInside() {
      return info.targetRectOnDown.contains(pointer.x, pointer.y)
    },
  }

  const dragFrame = () => {
    if (dragged) {
      frameID = window.requestAnimationFrame(dragFrame)
      delta.x = pointer.x - position.x
      delta.y = pointer.y - position.y
      position.x += delta.x
      position.y += delta.y
      onPressFrame?.(info)
    }
  }

  const onMouseDown = (event: MouseEvent) => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    frameID = window.requestAnimationFrame(dragFrame)
    dragged = true
    info.targetRectOnDown.copy(element.getBoundingClientRect())
    delta.x = 0
    delta.y = 0
    position.x = event.clientX
    position.y = event.clientY
    pointer.x = event.clientX
    pointer.y = event.clientY
    onPressStart?.(info)
  }

  const onMouseMove = (event: MouseEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    dragged = false
    onPressStop?.(info)
  }

  const onTouchStart = (event: TouchEvent) => {
    event.preventDefault() // prevent mouse events to be fired
    const touch = event.touches[0]
    if (touch) {
      window.addEventListener('touchmove', onTouchMove)
      window.addEventListener('touchend', onTouchEnd)
      frameID = window.requestAnimationFrame(dragFrame)
      dragged = true
      info.targetRectOnDown.copy(element.getBoundingClientRect())
      delta.x = 0
      delta.y = 0
      position.x = touch.clientX
      position.y = touch.clientY
      pointer.x = touch.clientX
      pointer.y = touch.clientY
      onPressStart?.(info)
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (touch) {
      pointer.x = touch.clientX
      pointer.y = touch.clientY
    }
  }

  const onTouchEnd = (event: TouchEvent) => {
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    dragged = false
    onPressStop?.(info)
  }

  element.addEventListener('mousedown', onMouseDown, { passive: false })
  element.addEventListener('touchstart', onTouchStart, { passive: false })

  return () => {
    element.removeEventListener('mousedown', onMouseDown)
    element.removeEventListener('touchstart', onTouchStart)

    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)

    window.cancelAnimationFrame(frameID)
  }
}

export type {
  Params as HandlePressParams,
  PressInfo
}

export {
  handlePress,
  hasPressCallback
}


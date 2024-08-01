import { ticker } from '../../../ticker'
import { PointerButton, PointerTarget } from './type'

type Direction = 'horizontal' | 'vertical'

type DragInfo = {
  direction: Direction
  startPosition: DOMPoint
  position: DOMPoint
  movement: DOMPoint
  delta: DOMPoint
  deltaTime: number

  shiftKey: boolean
  metaKey: boolean
  altKey: boolean
  ctrlKey: boolean
}

type Callback = (info: DragInfo) => void

const defaultParams = {
  dragDistanceThreshold: 10,
  dragPreventDefault: false,
  dragButton: PointerButton.Main,
  dragEaseFactor: 1,

  /**
   * The order in which the drag callback is called. 
   * 
   * If undefined, the drag callback is called by using window.requestAnimationFrame.
   * Otherwise, the drag callback is called by using ticker().requestAnimationFrame 
   * with the given order.
   */
  dragTickOrder: <number | undefined>undefined,
}

const callbackNames = [
  'onDragStart',
  'onDragStop',
  'onDrag',
  'onVerticalDragStart',
  'onVerticalDragStop',
  'onVerticalDrag',
  'onHorizontalDragStart',
  'onHorizontalDragStop',
  'onHorizontalDrag',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasDragCallback(params: Record<string, any>): boolean {
  return callbackNames.some(name => name in params)
}

function handleDrag(element: PointerTarget, params: Params): () => void {
  const {
    dragDistanceThreshold,
    dragPreventDefault,
    dragButton,
    dragEaseFactor,
    dragTickOrder,
    onDragStart,
    onDragStop,
    onDrag,
    onVerticalDragStart,
    onVerticalDragStop,
    onVerticalDrag,
    onHorizontalDragStart,
    onHorizontalDragStop,
    onHorizontalDrag,
  } = { ...defaultParams, ...params }

  let down = false
  let drag = false
  let dragIsLongEnough = false
  let frameID = -1
  const pointer = new DOMPoint(0, 0)
  const startPosition = new DOMPoint(0, 0)
  const position = new DOMPoint(0, 0)
  const positionOld = new DOMPoint(0, 0)
  const movement = new DOMPoint(0, 0)
  const delta = new DOMPoint(0, 0)
  const info: DragInfo = {
    direction: 'horizontal',
    startPosition,
    position,
    movement,
    delta,
    deltaTime: 1 / 60,

    shiftKey: false,
    metaKey: false,
    altKey: false,
    ctrlKey: false,
  }

  /**
   * Using a delegate function to request the next frame, since the order has to
   * be handled differently for the drag tick order.
   */
  const requestDragFrame = () => {
    frameID = dragTickOrder === undefined
      ? window.requestAnimationFrame(dragFrame)
      : ticker().requestAnimationFrame(dragFrame, { order: dragTickOrder })
  }

  const cancelDragFrame = () => {
    if (dragTickOrder === undefined) {
      window.cancelAnimationFrame(frameID)
    } else {
      ticker().cancelAnimationFrame(frameID)
    }
  }

  const frameStart = (x: number, y: number) => {
    requestDragFrame()
    down = true
    startPosition.x = x
    startPosition.y = y
    pointer.x = x
    pointer.y = y
  }

  const dragStart = () => {
    drag = true
    delta.x = 0
    delta.y = 0
    movement.x = 0
    movement.y = 0
    position.x = startPosition.x
    position.y = startPosition.y

    onDragStart?.(info)
    switch (info.direction) {
      case 'horizontal': {
        onHorizontalDragStart?.(info)
        break
      }
      case 'vertical': {
        onVerticalDragStart?.(info)
        break
      }
    }
  }

  const dragStop = () => {
    drag = false

    onDragStop?.(info)
    switch (info.direction) {
      case 'horizontal': {
        onHorizontalDragStop?.(info)
        break
      }
      case 'vertical': {
        onVerticalDragStop?.(info)
        break
      }
    }
  }

  const updatePosition = (x: number, y: number) => {
    positionOld.x = position.x
    positionOld.y = position.y
    position.x += (x - position.x) * dragEaseFactor
    position.y += (y - position.y) * dragEaseFactor
    delta.x = position.x - positionOld.x
    delta.y = position.y - positionOld.y
    movement.x = position.x - startPosition.x
    movement.y = position.y - startPosition.y
  }

  const dragUpdate = () => {
    if (dragIsLongEnough) {
      updatePosition(pointer.x, pointer.y)
    } else {
      updatePosition(startPosition.x, startPosition.y)
    }

    onDrag?.(info)
    switch (info.direction) {
      case 'horizontal': {
        onHorizontalDrag?.(info)
        break
      }
      case 'vertical': {
        onVerticalDrag?.(info)
        break
      }
    }
  }

  let msOld = 0
  const dragFrame = (ms: number) => {
    info.deltaTime = (ms - msOld) / 1e3
    msOld = ms

    if (down) {
      requestDragFrame()

      const dx = startPosition.x - pointer.x
      const dy = startPosition.y - pointer.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      dragIsLongEnough = distance > dragDistanceThreshold

      if (drag === false) {
        if (dragIsLongEnough) {
          info.direction = Math.abs(dx / dy) >= 1 ? 'horizontal' : 'vertical'
          dragStart()
        }
      }

      if (drag) {
        dragUpdate()
      }
    }
  }

  const onMouseDown = (event: MouseEvent) => {
    if (dragButton & (1 << event.button)) {
      window.addEventListener('mousemove', onMouseMove, { passive: false })
      window.addEventListener('mouseup', onMouseUp)
      frameStart(event.clientX, event.clientY)
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY

    info.shiftKey = event.shiftKey
    info.metaKey = event.metaKey
    info.altKey = event.altKey
    info.ctrlKey = event.ctrlKey

    if (drag && dragPreventDefault) {
      event.preventDefault()
    }
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    if (drag) {
      dragStop()
    }
    down = false
  }

  let firstTouch: Touch | null = null
  const onTouchStart = (event: TouchEvent) => {
    if (dragButton & PointerButton.Main) {
      const touch = event.changedTouches[0]
      if (firstTouch === null) {
        firstTouch = touch
        window.addEventListener('touchmove', onTouchMove, { passive: false })
        window.addEventListener('touchend', onTouchEnd)
        requestDragFrame()
        down = true
        delta.x = 0
        delta.y = 0
        movement.x = 0
        movement.y = 0
        startPosition.x = touch.clientX
        startPosition.y = touch.clientY
        position.x = touch.clientX
        position.y = touch.clientY
        pointer.x = touch.clientX
        pointer.y = touch.clientY
      }
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    if (touch.identifier === firstTouch!.identifier) {
      pointer.x = touch.clientX
      pointer.y = touch.clientY

      info.shiftKey = event.shiftKey
      info.metaKey = event.metaKey
      info.altKey = event.altKey
      info.ctrlKey = event.ctrlKey

      if (drag && dragPreventDefault) {
        event.preventDefault()
      }
    }
  }

  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    if (touch.identifier === firstTouch!.identifier) {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      if (drag) {
        dragStop()
      }
      down = false
      firstTouch = null
    }
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

    cancelDragFrame()
  }
}

export type {
  DragInfo, Params as HandleDragParams
}

export {
  handleDrag,
  hasDragCallback
}


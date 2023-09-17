
type BasicPointerInfo = {
  entered: boolean
  pressed: boolean
  position: DOMPoint
  downPosition: DOMPoint
  upPosition: DOMPoint
}

type Callback = (info: BasicPointerInfo) => void

const defaultParams = {
}

const callbackNames = [
  'onDown',
  'onUp',
  'onMove',
  'onEnter',
  'onLeave',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasBasicPointerCallback(params: Record<string, any>): boolean {
  return callbackNames.some(name => name in params)
}

function handleBasicPointer(element: HTMLElement, params: Params): () => void {
  const info: BasicPointerInfo = {
    pressed: false,
    entered: false,
    position: new DOMPoint(),
    downPosition: new DOMPoint(),
    upPosition: new DOMPoint(),
  }
  const onPointerDown = (event: PointerEvent) => {
    info.pressed = true
    info.downPosition.x = event.clientX
    info.downPosition.y = event.clientY
    params.onDown?.(info)
  }
  const onPointerUp = (event: PointerEvent) => {
    info.upPosition.x = event.clientX
    info.upPosition.y = event.clientY
    params.onUp?.(info)
  }

  // Move is tricky, handle "mouse" & "touch" separately.
  const onMouseMove = (event: MouseEvent) => {
    info.position.x = event.clientX
    info.position.y = event.clientY
    params.onMove?.(info)
  }
  const onTouchStart = (event: TouchEvent) => {
    // Because when the touch start the position is not the same as the previous touch.
    if (event.touches.length === 1) { // ignore multi-touch
      info.position.x = event.touches[0].clientX
      info.position.y = event.touches[0].clientY
      params.onMove?.(info)
    }
  }
  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 1) { // ignore multi-touch
      info.position.x = event.touches[0].clientX
      info.position.y = event.touches[0].clientY
      params.onMove?.(info)
    }
  }

  const onMouseOver = () => {
    document.body.addEventListener('mouseup', onBodyMouseUp)
    checkForEnter()
  }
  
  const onMouseOut = () => {
    checkForLeave()
  }

  const onBodyMouseUp = () => {
    info.pressed = false
    checkForLeave()
    document.documentElement.removeEventListener('mouseup', onBodyMouseUp)
  }
  
  const checkForEnter = () => {
    if (info.entered === false) {
      info.entered = true
      params.onEnter?.(info)
    }
  }
  const checkForLeave = () => {
    if (info.entered) {
      if (info.pressed === false) {
        info.entered = false
        params.onLeave?.(info)
      }
    }
  }

  element.addEventListener('mouseover', onMouseOver)
  element.addEventListener('mouseout', onMouseOut)
  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('mousemove', onMouseMove)
  element.addEventListener('touchstart', onTouchStart)
  element.addEventListener('touchmove', onTouchMove)
  
  return () => {
    element.removeEventListener('mouseover', onMouseOver)
    element.removeEventListener('mouseout', onMouseOut)
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointerup', onPointerUp)
    element.removeEventListener('mousemove', onMouseMove)
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('touchmove', onTouchMove)
    document.body.removeEventListener('mouseup', onBodyMouseUp)
  }
}

export type {
  Params as HandleBasicPointerParams,
  BasicPointerInfo,
}

export {
  handleBasicPointer,
  hasBasicPointerCallback,
}
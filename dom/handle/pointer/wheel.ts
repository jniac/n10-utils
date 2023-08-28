
type WheelInfo = {
  time: number
  deltaTime: number
  delta: DOMPoint
}

type Callback = (info: WheelInfo) => void

const defaultParams = {
}

const callbackNames = [
  'onWheel',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasWheelCallback(params: Record<string, any>): boolean {
	return callbackNames.some(name => name in params)
}

function getDeltaScalar(deltaMode: number): number {
  // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
  const DOM_DELTA_PIXEL = 0x0
  const DOM_DELTA_LINE = 0x1
  const DOM_DELTA_PAGE = 0x2
  switch(deltaMode) {
    default:
    case DOM_DELTA_PIXEL: return 1
    case DOM_DELTA_LINE: return 16
    case DOM_DELTA_PAGE: return 1000
  }
}

function handleWheel(element: HTMLElement, params: Params): () => void {
  const {
    onWheel,
  } = { ...defaultParams, ...params }

  const info: WheelInfo = {
    time: -1,
    deltaTime: -1,
    delta: new DOMPoint(),
  }
  
  const _onWheel = (event: WheelEvent) => {
    const time = event.timeStamp / 1e3
    info.deltaTime = time - info.time
    info.time = time
    const scalar = getDeltaScalar(event.deltaMode)
    info.delta.x = event.deltaX * scalar
    info.delta.y = event.deltaY * scalar
    info.delta.z = event.deltaZ * scalar
    onWheel?.(info)
  }
  
  element.addEventListener('wheel', _onWheel)

  return () => {
    element.removeEventListener('wheel', _onWheel)
  }
}

export type {
  Params as HandleWheelParams,
  WheelInfo,
}

export {
  hasWheelCallback,
  handleWheel,
}

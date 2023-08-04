
type BasicPointerInfo = {
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
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasBasicPointerCallback(params: Record<string, any>): boolean {
	return callbackNames.some(name => name in params)
}

function handleBasicPointer(element: HTMLElement, params: Params): () => void {
  const info: BasicPointerInfo = {
    position: new DOMPoint(),
    downPosition: new DOMPoint(),
    upPosition: new DOMPoint(),
  }
  const onPointerDown = (event: PointerEvent) => {
    info.downPosition.x = event.clientX
    info.downPosition.y = event.clientY
    params.onDown?.(info)
  }
  const onPointerUp = (event: PointerEvent) => {
    info.upPosition.x = event.clientX
    info.upPosition.y = event.clientY
    params.onUp?.(info)
  }
  const onPointerMove = (event: PointerEvent) => {
    info.position.x = event.clientX
    info.position.y = event.clientY
    params.onMove?.(info)
  }
	
  element.addEventListener("pointerdown", onPointerDown)
	element.addEventListener("pointerup", onPointerUp)
	element.addEventListener("pointermove", onPointerMove)

  return () => {
    element.removeEventListener("pointerdown", onPointerDown)
    element.removeEventListener("pointerup", onPointerUp)
    element.removeEventListener("pointermove", onPointerMove)
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
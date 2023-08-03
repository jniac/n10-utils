
type TapInfo = {
  timestamp: number
  downTarget: HTMLElement
  clientX: number
  clientY: number
}

type Callback = (info: TapInfo) => void

const defaultParams = {
  /** The max distance that the user may travel when down. */
  maxDistance: 10,
  /** The max duration that the user may stay down (seconds). */
  maxDuration: .3,
}

const callbackNames = [
  'onTap',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasTapCallback(params: Record<string, any>): boolean {
	return callbackNames.some(name => name in params)
}

function handleTap(element: HTMLElement, params: Params): () => void {
  const {
    maxDistance,
    maxDuration,
    onTap,
  } = { ...defaultParams, ...params }

  const info: TapInfo = {
    timestamp: -1,
    downTarget: null!,
    clientX: 0,
    clientY: 0,
  }

  const onPointerDown = (event: PointerEvent) => {
    info.timestamp = Date.now()
    info.clientX = event.clientX
    info.clientY = event.clientY
    window.addEventListener("pointerup", onPointerUp)
    info.downTarget = event.target as HTMLElement
  }
  const onPointerUp = (event: PointerEvent) => {
    window.removeEventListener("pointerup", onPointerUp)
    const duration = (Date.now() - info.timestamp) / 1e3
    const x = event.clientX - info.clientX
    const y = event.clientY - info.clientY
    const distance = Math.sqrt(x * x + y * y)
    if (distance <= maxDistance && duration < maxDuration) {
      onTap?.(info)
    }
  }

  element.addEventListener("pointerdown", onPointerDown)

  return () => {
    element.removeEventListener("pointerdown", onPointerDown)
    window.removeEventListener("pointerup", onPointerUp)
  }
}

export type {
  Params as HandleTapParams,
  TapInfo,
}

export {
  hasTapCallback,
  handleTap,
}

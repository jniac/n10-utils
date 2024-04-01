import { PointerTarget } from './type'

class TapInfo {
  constructor(
    readonly timestamp: number,
    readonly tapTarget: HTMLElement | SVGElement,
    readonly downTarget: HTMLElement | SVGElement,
    readonly downPosition: DOMPoint,
    readonly orignalDownEvent: PointerEvent,
  ) { }

  get localDownPosition(): DOMPoint {
    const rect = this.tapTarget.getBoundingClientRect()
    const { x, y } = this.downPosition
    return new DOMPoint(
      x - rect.x,
      y - rect.y,
    )
  }

  get relativeLocalDownPosition(): DOMPoint {
    const rect = this.tapTarget.getBoundingClientRect()
    const { x, y } = this.downPosition
    return new DOMPoint(
      (x - rect.x) / rect.width,
      (y - rect.y) / rect.height,
    )
  }

  // Still here for compatibility.
  get clientX() { return this.orignalDownEvent.clientX }
  get clientY() { return this.orignalDownEvent.clientX }

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

function handleTap(element: PointerTarget, params: Params): () => void {
  const {
    maxDistance,
    maxDuration,
    onTap,
  } = { ...defaultParams, ...params }

  let info: TapInfo = null!

  const onPointerDown = (event: PointerEvent) => {
    info = new TapInfo(
      Date.now(),
      element,
      event.target as HTMLElement,
      new DOMPoint(event.clientX, event.clientY),
      event,
    )
    window.addEventListener('pointerup', onPointerUp)
  }
  const onPointerUp = (event: PointerEvent) => {
    window.removeEventListener('pointerup', onPointerUp)
    const duration = (Date.now() - info.timestamp) / 1e3
    const x = event.clientX - info.downPosition.x
    const y = event.clientY - info.downPosition.y
    const distance = Math.sqrt(x * x + y * y)
    if (distance <= maxDistance && duration < maxDuration) {
      onTap?.(info)
    }
  }

  element.addEventListener('pointerdown', onPointerDown)

  return () => {
    element.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerup', onPointerUp)
  }
}

export type {
  Params as HandleTapParams,
  TapInfo
}

export {
  handleTap, hasTapCallback
}


import { clamp } from '../../../math/basics'
import { InfoBase } from './info'
import { EventPhase, PointerTarget } from './type'

class WheelInfo extends InfoBase {
  /** The time of the event, in seconds. */
  time = -1

  /** The raw value of the delta time, based on the event timestamp, and not normalized. */
  rawDeltaTime = -1

  /** The normalized value of the delta time, clamped between 1/120 and 1/30. */
  deltaTime = -1

  delta = new DOMPoint()

  phase = <EventPhase>'start'
}

type Callback = (info: WheelInfo) => void

const defaultParams = {
  preventDefault: false,
}

const callbackNames = [
  'onWheel',
  'onWheelStart',
  'onWheelEnd',
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
  switch (deltaMode) {
    default:
    case DOM_DELTA_PIXEL: return 1
    case DOM_DELTA_LINE: return 16
    case DOM_DELTA_PAGE: return 1000
  }
}

function handleWheel(element: PointerTarget, params: Params): () => void {
  const {
    preventDefault,
    onWheel,
    onWheelStart,
    onWheelEnd,
  } = { ...defaultParams, ...params }

  const state = {
    start: false,
    timeout: -1,
    time: -1,
  }

  const info = new WheelInfo()

  const _onWheel = (event: WheelEvent) => {
    if (preventDefault)
      event.preventDefault()

    const phase: EventPhase = state.start === false
      ? 'start'
      : 'continue'

    const time = event.timeStamp / 1e3
    const rawDeltaTime = phase === 'start' ? 1 / 60 : time - state.time
    state.time = time

    info.phase = phase
    info.time = time

    const scalar = getDeltaScalar(event.deltaMode)
    info.delta.x = event.deltaX * scalar
    info.delta.y = event.deltaY * scalar
    info.delta.z = event.deltaZ * scalar

    const deltaTime = clamp(rawDeltaTime, 1 / 240, 1 / 30)

    info.rawDeltaTime = rawDeltaTime
    info.deltaTime = deltaTime
    if (phase === 'start') {
      state.start = true
      onWheelStart?.(info)
    }
    onWheel?.(info)
    window.clearTimeout(state.timeout)
    state.timeout = window.setTimeout(() => {
      state.start = false
      info.phase = 'end'
      info.deltaTime = 0.1
      info.time = time + 0.1
      info.delta.x = 0
      info.delta.y = 0
      info.delta.z = 0
      onWheelEnd?.(info)
    }, 100)
  }

  element.addEventListener('wheel', _onWheel, { passive: !preventDefault })

  return () => {
    element.removeEventListener('wheel', _onWheel)
  }
}

export type {
  Params as HandleWheelParams,
  WheelInfo
}

export {
  handleWheel,
  hasWheelCallback
}


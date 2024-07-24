import { clamp } from '../../../math/basics'
import { ticker } from '../../../ticker'
import { InfoBase } from './info'
import { EventPhase, PointerTarget } from './type'

const MAX_CONSECUTIVE_ZERO_FRAMES = 8
const DAMPING = 0.1 ** 30 // decay by seconds (@30fps decrease to 50% per frame)

class WheelFrameInfo extends InfoBase {
  constructor(
    public time: number = 0,
    public deltaTime: number = 0,
    public delta: DOMPoint = new DOMPoint(),
    public phase: EventPhase = 'start',
  ) { super() }
}

type Callback = (info: WheelFrameInfo) => void

const defaultParams = {
  /**
   * Whether to prevent the default behavior of the wheel event.
   */
  preventDefault: false,

  /**
   * The order in which the drag callback is called. 
   * 
   * If undefined, the drag callback is called by using window.requestAnimationFrame.
   * Otherwise, the drag callback is called by using ticker().requestAnimationFrame 
   * with the given order.
   */
  wheelFrameTickOrder: <number | undefined>undefined,
}

const callbackNames = [
  'onWheelFrame',
  'onWheelFrameStart',
  'onWheelFrameEnd',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasWheelFrameCallback(params: Record<string, any>): boolean {
  return callbackNames.some(name => name in params)
}

class DOMPointArray {
  data: DOMPoint[] = []
  sum = new DOMPoint()
  average = new DOMPoint()
  constructor(public capacity = 5) { }
  add(point: DOMPoint) {
    if (this.data.length === this.capacity) {
      const removed = this.data.shift()!
      this.sum.x -= removed.x
      this.sum.y -= removed.y
      this.sum.z -= removed.z
    }
    this.data.push(point)
    this.sum.x += point.x
    this.sum.y += point.y
    this.sum.z += point.z

    const length = this.data.length
    this.average.x = this.sum.x / length
    this.average.y = this.sum.y / length
    this.average.z = this.sum.z / length
  }
}

/**
 * Absolutely WIP. Here's just a draft. 
 * Do not use this. 
 * But fix/complete it.
 */
function handleWheelFrame(element: PointerTarget, params: Params): () => void {
  const {
    preventDefault,
    wheelFrameTickOrder,
    onWheelFrame,
    onWheelFrameStart,
    onWheelFrameEnd,
  } = { ...defaultParams, ...params }

  const _state = {
    msOld: 0,
    frame: 0,
    frameID: 0,
    deltaTime: 0,
    time: 0,
    position: new DOMPoint(),
    positionOld: new DOMPoint(),

    eventCount: 0,
    eventCountOld: 0,
    eventFrame: 0,
    eventMsOld: 0,
    eventPosition: new DOMPoint(),
    eventVelocities: new DOMPointArray(5),
    eventVelocity: new DOMPoint(),
  }

  const _onWheel = (event: WheelEvent) => {
    if (preventDefault) {
      event.preventDefault()
    }
    const eventDeltaTime = _state.eventCount === 0
      ? 1 / 60
      : (event.timeStamp - _state.eventMsOld) / 1e3

    if (_state.eventCount === 0) {
      _requestFrame()
    }

    _state.eventPosition.x += event.deltaX
    _state.eventPosition.y += event.deltaY
    _state.eventPosition.z += event.deltaZ

    const velocity = new DOMPoint()
    velocity.x = event.deltaX / eventDeltaTime
    velocity.y = event.deltaY / eventDeltaTime
    velocity.z = event.deltaZ / eventDeltaTime
    _state.eventVelocities.add(velocity)

    _state.eventCount++
    _state.eventFrame = _state.frame
    _state.eventMsOld = event.timeStamp
  }

  const _requestFrame = () => {
    _cancelFrame()
    _state.frameID = wheelFrameTickOrder === undefined
      ? window.requestAnimationFrame(_frame)
      : ticker().requestAnimationFrame(_frame, { order: wheelFrameTickOrder })
  }

  const _cancelFrame = () => {
    if (wheelFrameTickOrder === undefined) {
      window.cancelAnimationFrame(_state.frameID)
    } else {
      ticker().cancelAnimationFrame(_state.frameID)
    }
  }

  const _frame = (ms: number) => {
    const phase: EventPhase =
      _state.eventCountOld === 0 ? 'start' :
        _state.frame === _state.eventFrame + MAX_CONSECUTIVE_ZERO_FRAMES ? 'end' :
          'continue'

    console.log(phase)

    const rawDeltaTime = (ms - _state.msOld) / 1e3
    const deltaTime = phase === 'start'
      ? 1 / 60
      : clamp(rawDeltaTime, 1 / 240, 1 / 30)
    _state.deltaTime = deltaTime
    _state.msOld = ms

    if (phase !== 'end') {
      _requestFrame()
    } else {
      _cancelFrame()
    }

    _state.time += deltaTime

    if (phase === 'end') {
      // Back to the original position at the end of the wheel event.
      _state.position.x = _state.eventPosition.x
      _state.position.y = _state.eventPosition.y
      _state.position.z = _state.eventPosition.z
    } else {
      const { x, y, z } = _state.eventVelocities.average
      _state.position.x += x * deltaTime * 8
      _state.position.y += y * deltaTime * 8
      _state.position.z += z * deltaTime * 8
      // Damping the position to make it smooth.
      const frameDamping = DAMPING ** deltaTime
      _state.position.x += (_state.eventPosition.x - _state.position.x) * frameDamping
      _state.position.y += (_state.eventPosition.y - _state.position.y) * frameDamping
      _state.position.z += (_state.eventPosition.z - _state.position.z) * frameDamping
    }

    const delta = new DOMPoint()
    delta.x = _state.position.x - _state.positionOld.x
    delta.y = _state.position.y - _state.positionOld.y
    delta.z = _state.position.z - _state.positionOld.z

    const info = new WheelFrameInfo(_state.time, deltaTime, delta, phase)

    if (phase === 'start') {
      onWheelFrameStart?.(info)
    }

    onWheelFrame?.(info)

    if (phase !== 'end') {
      _state.eventCountOld = _state.eventCount
      _state.frame++
      _state.positionOld.x = _state.position.x
      _state.positionOld.y = _state.position.y
      _state.positionOld.z = _state.position.z
    } else {
      _state.eventCount = 0
      _state.eventCountOld = 0
      _state.frame = 0
      onWheelFrameEnd?.(info)
    }
  }

  element.addEventListener('wheel', _onWheel, { passive: !preventDefault })

  return () => {
    element.removeEventListener('wheel', _onWheel)
    _cancelFrame()
  }
}

export type {
  Params as HandleWheelFrameParams
}

export {
  handleWheelFrame,
  hasWheelFrameCallback
}


import { DestroyableObject } from "../../types"

const defaultParams = {
  /** The max distance that the user may travel when down. */
  maxDistance: 10,
  /** The max duration that the user may stay down (seconds). */
  maxDuration: .3,
}

type Info = {
  timestamp: number
  downTarget: HTMLElement
  clientX: number
  clientY: number
}

type Params = Partial<typeof defaultParams & {
  onTap: (info: Info) => void
}>

function handleTap(element: HTMLElement, params: Params): DestroyableObject {
  const {
    maxDistance,
    maxDuration,
    onTap,
  } = { ...defaultParams, ...params }

  const info: Info = {
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

  window.addEventListener("pointerdown", onPointerDown)

  const destroy = () => {
    window.removeEventListener("pointerdown", onPointerDown)
    window.removeEventListener("pointerup", onPointerUp)
  }
  return { destroy }
}

export type {
  Params as HandleTapParams,
}

export {
  handleTap,
}
